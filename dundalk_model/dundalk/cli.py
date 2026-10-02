"""Command line.

  python -m dundalk.cli synth    --out synthetic.csv
  python -m dundalk.cli backtest --results results.csv --out-dir reports/
  python -m dundalk.cli train    --results results.csv --model model.json
  python -m dundalk.cli predict  --results results.csv --card card.csv --model model.json --bank 500
"""

from __future__ import annotations

import argparse
import json
import os

import numpy as np
import pandas as pd

from . import backtest, data, features, synth
from .model import DundalkModel
from .staking import StakingRules, place_bets


def _rules(a) -> StakingRules:
    return StakingRules(kelly_fraction=a.kelly, commission=a.commission, min_edge=a.min_edge,
                        min_odds=a.min_odds, max_odds=a.max_odds)


def _load(path):
    print(f"Loading {path} and building features...")
    return features.build_features(data.load_results(path))


def cmd_synth(a):
    df = synth.generate(years=a.years, seed=a.seed)
    df.to_csv(a.out, index=False)
    print(f"Wrote {len(df)} SYNTHETIC runner rows to {a.out}")


def cmd_backtest(a):
    feats = _load(a.results)
    print("Walk-forward backtest:")
    preds = backtest.walk_forward(feats, {"l2": a.l2}, retrain_months=a.retrain_months)
    rep, bets = backtest.evaluate(preds, _rules(a))
    print()
    print(backtest.format_report(rep))
    os.makedirs(a.out_dir, exist_ok=True)
    preds.to_csv(os.path.join(a.out_dir, "predictions.csv"), index=False)
    bets.to_csv(os.path.join(a.out_dir, "bets.csv"), index=False)
    with open(os.path.join(a.out_dir, "summary.json"), "w") as fh:
        json.dump(rep, fh, indent=2, default=str)
    print(f"\nSaved predictions, bets and summary to {a.out_dir}/")


def cmd_train(a):
    feats = _load(a.results)
    m = DundalkModel(l2=a.l2).fit(feats)
    m.save(a.model)
    print(f"Trained on {m.fit_stats_['train_races']} Dundalk races "
          f"({m.fit_stats_['train_start']} to {m.fit_stats_['train_end']}). Saved {a.model}")
    print("Blend weights:", {k: round(v, 3) for k, v in m.blend_weights().items()})
    print("\nStrongest factors (coefficient on standardised feature; + = helps winning chance):")
    print(m.coefficients().head(25).to_string(index=False, float_format="%.3f"))


def cmd_predict(a):
    hist = pd.read_csv(a.results)
    card = pd.read_csv(a.card)
    card["race_id"] = "CARD-" + card["race_id"].astype(str)
    for col in ("finish_pos", "beaten_lengths", "win_time_s", "early_pos", "sp_decimal", "bsp"):
        card[col] = np.nan
    feats = features.build_features(data.prepare(pd.concat([hist, card], ignore_index=True)))
    today = feats[feats["race_id"].str.startswith("CARD-")]
    m = DundalkModel.load(a.model)
    preds = m.predict(today)
    preds["won"] = np.nan
    preds["fair_odds"] = 1 / preds["p_model"]

    for rid, race in preds.groupby("race_id", sort=False):
        r0 = race.iloc[0]
        print(f"\n{r0['off_time']}  {r0['course']}  {r0['distance_f']}f  ({len(race)} runners)")
        show = race.sort_values("p_model", ascending=False)
        for _, r in show.iterrows():
            name = r.get("horse_name", r["horse_id"])
            price = f"{r['bet_price']:6.2f}" if r["bet_price"] == r["bet_price"] else "   n/a"
            print(f"  {str(name)[:22]:22s} dr{int(r['draw']):>2}  model {r['p_model']:5.1%}  "
                  f"fair {r['fair_odds']:6.2f}  price {price}")
    bets = place_bets(preds, _rules(a), bank=a.bank)
    print("\nRecommended bets:" if not bets.empty else "\nNo bets meet the staking rules today.")
    if not bets.empty:
        cols = ["race_id", "horse_name", "odds", "fair_odds", "p_model", "p_mkt", "edge", "stake"]
        out = bets[cols].copy()
        out["race_id"] = out["race_id"].str.replace("CARD-", "", regex=False)
        print(out.to_string(index=False, float_format="%.3f"))
        print(f"Total staked: {bets['stake'].sum():.2f} of bank {a.bank:.2f}")
        print("Only bet when the price available is at or above `odds`.")


def main(argv=None):
    p = argparse.ArgumentParser(prog="dundalk", description="Dundalk racing betting model")
    sub = p.add_subparsers(dest="cmd", required=True)

    def staking_args(sp):
        sp.add_argument("--kelly", type=float, default=0.25, help="fraction of Kelly to stake")
        sp.add_argument("--commission", type=float, default=0.02, help="exchange commission")
        sp.add_argument("--min-edge", type=float, default=0.05, help="minimum expected value per unit")
        sp.add_argument("--min-odds", type=float, default=2.0)
        sp.add_argument("--max-odds", type=float, default=21.0)

    s = sub.add_parser("synth", help="write a SYNTHETIC dataset for testing")
    s.add_argument("--out", default="synthetic_results.csv")
    s.add_argument("--years", type=int, default=6)
    s.add_argument("--seed", type=int, default=7)
    s.set_defaults(fn=cmd_synth)

    s = sub.add_parser("backtest", help="walk-forward backtest")
    s.add_argument("--results", required=True)
    s.add_argument("--out-dir", default="reports")
    s.add_argument("--retrain-months", type=int, default=3)
    s.add_argument("--l2", type=float, default=2.0)
    staking_args(s)
    s.set_defaults(fn=cmd_backtest)

    s = sub.add_parser("train", help="fit on all results and save the model")
    s.add_argument("--results", required=True)
    s.add_argument("--model", default="model.json")
    s.add_argument("--l2", type=float, default=2.0)
    s.set_defaults(fn=cmd_train)

    s = sub.add_parser("predict", help="score a race card and suggest bets")
    s.add_argument("--results", required=True, help="history used to build the features")
    s.add_argument("--card", required=True, help="today's runners with current prices in early_price")
    s.add_argument("--model", default="model.json")
    s.add_argument("--bank", type=float, default=100.0)
    staking_args(s)
    s.set_defaults(fn=cmd_predict)

    a = p.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
