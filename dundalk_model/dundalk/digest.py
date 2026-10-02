"""Race-by-race form digest for a parsed racecard.

This shows the model's inputs for each runner, side by side. It is not a
prediction: probabilities need a trained model (see README).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import data, features


def _style(p):
    if p != p:
        return "?"
    return "Leader" if p <= 0.1 else "Prominent" if p <= 0.35 else "Midfield" if p <= 0.6 else "Held up"


def build(card: pd.DataFrame, hist: pd.DataFrame) -> pd.DataFrame:
    card = card.copy()
    for col in ("finish_pos", "sp_decimal", "beaten_lengths", "early_pos"):
        card[col] = np.nan
    both = pd.concat([hist, card.drop(columns=["field_size"], errors="ignore")], ignore_index=True)
    both["field_size"] = both.get("field_size")
    feats = features.build_features(data.prepare(both))
    # Card-only columns (forecast, career stats) come through the concat.
    today = feats[feats["race_id"].isin(card["race_id"])].copy()
    today["days_atr"] = today["days_since_run"]

    h = hist.sort_values("date")
    last3 = h.groupby("horse_id")["finish_pos"].apply(
        lambda s: "-".join(str(int(x)) if x > 0 else "0" for x in s.tail(3)))
    dk = h[h["course"] == "Dundalk"].groupby("horse_id").agg(
        dk_runs_6=("finish_pos", "size"), dk_wins_6=("finish_pos", lambda s: int((s == 1).sum())))
    last_win_or = h[h["finish_pos"] == 1].groupby("horse_id")["official_rating"].last()
    today["last3"] = today["horse_id"].map(last3).fillna("debut")
    today = today.join(dk, on="horse_id")
    today["or_vs_last_win"] = today["official_rating"] - today["horse_id"].map(last_win_or)
    today["style"] = today["pace_style"].map(_style)
    today["mkt_pct"] = today["mkt_prob"] * 100
    return today


def format_digest(d: pd.DataFrame) -> str:
    out = []
    for rid, race in d.groupby("race_id", sort=False):
        r0 = race.iloc[0]
        fronts = race[race["style"] == "Leader"]["horse_name"].tolist()
        out.append(f"\n{r0['off_time']}  {r0['course']}  {r0['distance_f']:g}f  {r0.get('race_type', '')}"
                   f"  ({len(race)} runners)")
        out.append(f"  Likely leaders: {', '.join(fronts) if fronts else 'none obvious'}")
        out.append(f"  {'Horse':20s} {'Dr':>2} {'Fcst':>6} {'Mkt%':>5} {'OR':>3} {'+/-':>4} {'vWin':>4} "
                   f"{'Days':>4} {'Last3':>8} {'AvgBL':>5} {'DkW/R':>5} {'AW W/R':>6} {'Style':>9}")
        for _, r in race.sort_values("mkt_pct", ascending=False).iterrows():
            def f(v, fmt):
                return format(v, fmt) if v == v and v is not None else "-"
            dk = f"{int(r['dk_wins_6'])}/{int(r['dk_runs_6'])}" if r["dk_runs_6"] == r["dk_runs_6"] else "-"
            aw = (f"{int(r['aw_wins'])}/{int(r['aw_starts'])}" if r["aw_starts"] == r["aw_starts"] else "-")
            out.append(
                f"  {r['horse_name'][:20]:20s} {int(r['draw']):>2} {str(r['forecast_sp']):>6} "
                f"{f(r['mkt_pct'], '5.1f'):>5} {f(r['official_rating'], '.0f'):>3} {f(r.get('or_change'), '+.0f'):>4} "
                f"{f(r['or_vs_last_win'], '+.0f'):>4} {f(r['days_atr'], '.0f'):>4} {r['last3']:>8} "
                f"{f(r.get('avg_bl_3'), '5.1f'):>5} {dk:>5} {aw:>6} {r['style']:>9}")
    out.append("\nFcst = ATR forecast SP; Mkt% = forecast as a probability (margin removed); "
               "+/- = rating change since last run;\nvWin = today's rating vs the rating it last won off "
               "(within the last 6 runs); AvgBL = average lengths beaten, last 3;\n"
               "DkW/R = Dundalk wins/runs in the last 6 runs; AW W/R = career all-weather record; "
               "Style = usual early position.")
    return "\n".join(out)
