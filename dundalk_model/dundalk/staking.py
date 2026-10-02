"""Fractional Kelly staking with the limits that keep a model's mistakes cheap.

Full Kelly maximises long-run growth only when your probabilities are right.
They never are exactly, and overbetting is far more costly than
underbetting, so the default is quarter Kelly with hard caps.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class StakingRules:
    kelly_fraction: float = 0.25
    commission: float = 0.02      # exchange commission on winnings (0 for a bookmaker)
    min_edge: float = 0.05        # skip bets returning less than +5% expected value
    min_odds: float = 2.0
    max_odds: float = 21.0        # longshot probabilities are the least reliable
    max_bet_frac: float = 0.02    # stake at most 2% of the bank on one horse
    max_race_frac: float = 0.05   # and at most 5% on one race
    max_model_vs_market: float = 2.5  # if model > 2.5x market, assume the model is wrong


def expected_value(p, odds, commission=0.0):
    """Expected profit per 1 unit staked, after commission on winnings."""
    return p * (odds - 1) * (1 - commission) - (1 - p)


def kelly_fraction(p, odds, commission=0.0):
    b = (odds - 1) * (1 - commission)
    return np.where(b > 0, (p * b - (1 - p)) / np.where(b > 0, b, 1), 0.0)


def stake_race(p, odds, p_mkt, bank, rules: StakingRules):
    """Stakes for every runner in one race (0 where there is no bet)."""
    p, odds = np.asarray(p, float), np.asarray(odds, float)
    p_mkt = np.asarray(p_mkt, float)
    ev = expected_value(p, odds, rules.commission)
    ok = (
        np.isfinite(odds) & (odds >= rules.min_odds) & (odds <= rules.max_odds)
        & (ev >= rules.min_edge)
        & ~(np.isfinite(p_mkt) & (p > rules.max_model_vs_market * p_mkt))
    )
    f = np.where(ok, kelly_fraction(p, odds, rules.commission), 0.0).clip(min=0)
    f = np.minimum(f * rules.kelly_fraction, rules.max_bet_frac)
    if f.sum() > rules.max_race_frac:
        f *= rules.max_race_frac / f.sum()
    return f * bank


def place_bets(preds: pd.DataFrame, rules: StakingRules, bank: float = 100.0,
               compound: bool = False) -> pd.DataFrame:
    """Go race by race, size bets and settle them. preds must have p_model,
    p_mkt, bet_price and (for settlement) won.

    compound=False stakes against a fixed bank, which gives a cleaner ROI;
    compound=True restakes against the running bank.
    """
    rows = []
    running = bank
    for rid, race in preds.groupby("race_id", sort=False):
        stakes = stake_race(race["p_model"], race["bet_price"], race["p_mkt"],
                            running if compound else bank, rules)
        for (idx, r), s in zip(race.iterrows(), stakes):
            if s <= 0:
                continue
            won = r.get("won", np.nan)
            pnl = np.nan
            if won == won:  # not NaN
                pnl = s * (r["bet_price"] - 1) * (1 - rules.commission) if won == 1 else -s
            close = r.get("bsp", np.nan)
            if not close == close:
                close = r.get("sp_decimal", np.nan)
            rows.append({
                "date": r["date"], "race_id": rid, "horse_id": r["horse_id"],
                "horse_name": r.get("horse_name", ""), "draw": r["draw"],
                "p_model": r["p_model"], "p_mkt": r["p_mkt"], "odds": r["bet_price"],
                "fair_odds": 1 / r["p_model"],
                "edge": expected_value(r["p_model"], r["bet_price"], rules.commission),
                "stake": s, "won": won, "pnl": pnl, "closing_odds": close,
            })
        if compound:
            running += sum(x["pnl"] for x in rows if x["race_id"] == rid and x["pnl"] == x["pnl"])
    return pd.DataFrame(rows)
