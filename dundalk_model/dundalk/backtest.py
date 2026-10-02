"""Walk-forward backtest: train only on the past, predict the next block, repeat.

The test figures are honest only if
  * the model never sees a race before predicting it (walk-forward does that),
  * bets are struck at prices you could really have taken (use
    `early_price`; SP or BSP is only known at the off, which makes a backtest
    look better than live betting will be), and
  * the result is judged with a confidence interval rather than one ROI
    number, because racing profits are very noisy.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .model import DundalkModel, race_log_loss
from .staking import StakingRules, place_bets


def walk_forward(feats: pd.DataFrame, model_kwargs=None, retrain_months: int = 3,
                 min_train_days: int = 365, verbose: bool = True) -> pd.DataFrame:
    model_kwargs = model_kwargs or {}
    dk = DundalkModel.training_rows(feats)
    start = dk["date"].min() + pd.Timedelta(days=min_train_days)
    end = dk["date"].max()
    blocks = pd.date_range(start.normalize(), end + pd.offsets.MonthBegin(1),
                           freq=f"{retrain_months}MS")
    if len(blocks) == 0 or blocks[0] > start:
        blocks = blocks.insert(0, start.normalize())
    preds = []
    for lo, hi in zip(blocks[:-1], blocks[1:]):
        test = dk[(dk["date"] >= lo) & (dk["date"] < hi)]
        if test.empty:
            continue
        model = DundalkModel(**model_kwargs).fit(feats[feats["date"] < lo])
        preds.append(model.predict(test))
        if verbose:
            print(f"  {lo.date()} to {(hi - pd.Timedelta(days=1)).date()}: "
                  f"trained on {model.fit_stats_['train_races']} races, "
                  f"tested {test['race_id'].nunique()}")
    return pd.concat(preds).sort_values(["date", "off_time", "race_id", "draw"])


def _bootstrap_roi(bets: pd.DataFrame, n=2000, seed=0):
    by_race = bets.groupby("race_id")[["stake", "pnl"]].sum().to_numpy()
    if len(by_race) < 2:
        return (np.nan, np.nan)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(by_race), size=(n, len(by_race)))
    s = by_race[idx]
    roi = s[..., 1].sum(1) / s[..., 0].sum(1)
    return tuple(np.percentile(roi, [2.5, 97.5]))


def _max_drawdown(pnl: pd.Series) -> float:
    eq = pnl.cumsum()
    return float((eq.cummax() - eq).max()) if len(eq) else 0.0


def evaluate(preds: pd.DataFrame, rules: StakingRules | None = None, bank: float = 100.0):
    rules = rules or StakingRules()
    rid, won = preds["race_id"].to_numpy(), preds["won"].to_numpy()
    n_races = preds["race_id"].nunique()
    null = float(np.log(preds.groupby("race_id").size()).mean())

    def r2(ll):
        return 1 - ll / null

    report = {"races": int(n_races), "log_loss_uniform": null}
    for name in ("p_fund", "p_model"):
        ll = race_log_loss(preds[name].to_numpy(), won, rid)
        report[f"log_loss_{name}"] = ll
        report[f"pseudo_r2_{name}"] = r2(ll)
    priced = preds["p_mkt"].notna().groupby(preds["race_id"]).transform("all")
    if priced.any():
        sub = preds[priced]
        srid, swon = sub["race_id"].to_numpy(), sub["won"].to_numpy()
        report["priced_races"] = int(sub["race_id"].nunique())
        report["log_loss_market"] = race_log_loss(sub["p_mkt"].to_numpy(), swon, srid)
        report["log_loss_model_priced"] = race_log_loss(sub["p_model"].to_numpy(), swon, srid)
        report["pseudo_r2_market"] = r2(report["log_loss_market"])

    bets = place_bets(preds, rules, bank=bank)
    if bets.empty:
        report["bets"] = 0
        return report, bets
    bets["year"] = pd.to_datetime(bets["date"]).dt.year
    turnover, profit = bets["stake"].sum(), bets["pnl"].sum()
    lo, hi = _bootstrap_roi(bets)
    report.update({
        "bets": int(len(bets)),
        "winners": int(bets["won"].sum()),
        "strike_rate": float(bets["won"].mean()),
        "avg_odds": float(bets["odds"].mean()),
        "turnover": float(turnover),
        "profit": float(profit),
        "roi": float(profit / turnover),
        "roi_95ci": (float(lo), float(hi)),
        "max_drawdown": _max_drawdown(bets["pnl"]),
        "by_year": (bets.groupby("year")
                        .agg(bets=("stake", "size"), turnover=("stake", "sum"), profit=("pnl", "sum"))
                        .assign(roi=lambda t: t["profit"] / t["turnover"])
                        .round(3).reset_index().to_dict("records")),
    })
    has_close = bets["closing_odds"].notna() & (bets["closing_odds"] > 1)
    if has_close.any():
        b = bets[has_close]
        # Closing-line value: did we take a bigger price than the race closed at?
        report["clv_beat_close"] = float((b["odds"] > b["closing_odds"]).mean())
        report["clv_avg"] = float((b["odds"] / b["closing_odds"] - 1).median())
    return report, bets


def format_report(rep: dict) -> str:
    L = []
    L.append(f"Races tested: {rep['races']}")
    L.append("Probability quality (lower log loss = better; pseudo-R2 vs picking at random):")
    L.append(f"  fundamental model : log loss {rep['log_loss_p_fund']:.4f}  R2 {rep['pseudo_r2_p_fund']:.4f}")
    L.append(f"  final (blended)   : log loss {rep['log_loss_p_model']:.4f}  R2 {rep['pseudo_r2_p_model']:.4f}")
    if "log_loss_market" in rep:
        L.append(f"  market alone      : log loss {rep['log_loss_market']:.4f}  R2 {rep['pseudo_r2_market']:.4f}"
                 f"   (blend on same {rep['priced_races']} races: {rep['log_loss_model_priced']:.4f})")
        verdict = ("BEATS" if rep["log_loss_model_priced"] < rep["log_loss_market"] else "does NOT beat")
        L.append(f"  -> blended model {verdict} the market's probabilities")
    if not rep.get("bets"):
        L.append("No bets met the staking rules.")
        return "\n".join(L)
    lo, hi = rep["roi_95ci"]
    L.append("Betting (level bank of 100 points):")
    L.append(f"  bets {rep['bets']}, winners {rep['winners']} ({rep['strike_rate']:.1%}), avg odds {rep['avg_odds']:.2f}")
    L.append(f"  turnover {rep['turnover']:.1f}, profit {rep['profit']:+.1f}, ROI {rep['roi']:+.1%}"
             f"  (95% CI {lo:+.1%} to {hi:+.1%})")
    L.append(f"  max drawdown {rep['max_drawdown']:.1f} points")
    if "clv_beat_close" in rep:
        L.append(f"  closing line: price beat SP/BSP on {rep['clv_beat_close']:.0%} of bets "
                 f"(median {rep['clv_avg']:+.1%})")
    for y in rep["by_year"]:
        L.append(f"    {y['year']}: {y['bets']:5d} bets  turnover {y['turnover']:8.1f}  "
                 f"profit {y['profit']:+8.1f}  ROI {y['roi']:+.1%}")
    if lo <= 0:
        L.append("  NOTE: the 95% interval includes zero, so this is not yet evidence of a real edge.")
    return "\n".join(L)
