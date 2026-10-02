"""Loading and validating race results.

One row per runner. Include every run you can get for horses that race at
Dundalk, including their turf and UK runs, because form from other courses
feeds the features. Only Dundalk races are modelled and bet.
"""

from __future__ import annotations

import re

import numpy as np
import pandas as pd

from .course import distance_band, is_dundalk

REQUIRED = ["race_id", "date", "course", "distance_f", "horse_id", "draw", "finish_pos"]

OPTIONAL = [
    "off_time",        # "HH:MM", orders races within a day
    "surface",         # "AW" / "Turf"
    "race_type",       # "Handicap", "Maiden", ...
    "race_class",      # numeric class/grade, lower = better
    "horse_name", "age", "sex",
    "weight_lbs",      # weight carried
    "jockey_claim",    # allowance in lbs
    "official_rating",
    "trainer", "jockey",
    "sp_decimal",      # starting price, decimal odds or fractional ("5/2", "Evs")
    "bsp",             # Betfair starting price
    "early_price",     # decimal price available when you would bet (best for backtests)
    "beaten_lengths",  # distance behind the winner (0 for the winner)
    "win_time_s",      # race winning time in seconds
    "early_pos",       # position at the first call (pace / run style)
]

PRICE_COLS = ["early_price", "bsp", "sp_decimal"]


def parse_odds(value) -> float:
    """Convert '5/2', 'Evs', '11/4F', 3.5, etc. to decimal odds."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value) if value > 1 else np.nan
    s = str(value).strip().lower().rstrip("fjc ").strip()
    if s in ("evs", "evens", "even", "ev"):
        return 2.0
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", s)
    if m:
        return 1.0 + float(m.group(1)) / float(m.group(2))
    try:
        v = float(s)
        return v if v > 1 else np.nan
    except ValueError:
        return np.nan


def load_results(path: str) -> pd.DataFrame:
    return prepare(pd.read_csv(path))


def _normalised_implied(df: pd.DataFrame, price_col: str) -> pd.Series:
    raw = 1.0 / df[price_col]
    total = raw.groupby(df["race_id"]).transform("sum")
    return raw / total


def prepare(df: pd.DataFrame) -> pd.DataFrame:
    """Validate, coerce types and add the basic derived columns."""
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise ValueError(f"results data missing required columns: {missing}")

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["race_id"] = df["race_id"].astype(str)
    df["horse_id"] = df["horse_id"].astype(str)
    for col in ("trainer", "jockey"):
        if col in df.columns:
            df[col] = df[col].fillna("UNKNOWN").astype(str)
    for col in PRICE_COLS:
        if col in df.columns:
            df[col] = df[col].map(parse_odds)
    numeric = ["distance_f", "draw", "finish_pos", "age", "weight_lbs", "jockey_claim",
               "official_rating", "race_class", "beaten_lengths", "win_time_s", "early_pos"]
    for col in numeric:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "off_time" not in df.columns:
        df["off_time"] = "00:00"
    df["off_time"] = df["off_time"].fillna("00:00").astype(str)
    df = df.sort_values(["date", "off_time", "race_id", "draw"]).reset_index(drop=True)

    df["is_dundalk"] = df["course"].map(is_dundalk).astype(int)
    if "surface" in df.columns:
        df["is_aw"] = df["surface"].astype(str).str.upper().str.startswith("AW").astype(int)
        df.loc[df["is_dundalk"] == 1, "is_aw"] = 1
    else:
        df["is_aw"] = df["is_dundalk"]
    df["dist_band"] = df["distance_f"].map(distance_band)
    df["field_size"] = df.groupby("race_id")["horse_id"].transform("count")

    # Outcomes. Rows with no finish_pos are future runners on a race card.
    has_result = df.groupby("race_id")["finish_pos"].transform(lambda s: s.notna().any())
    df["has_result"] = has_result.astype(bool)
    pos = df["finish_pos"]
    # Non-finishers (0 / blank in a resulted race) count as last.
    pos = pos.where(~(df["has_result"] & (pos.isna() | (pos <= 0))), df["field_size"])
    df["finish_pos"] = pos
    df["won"] = np.where(df["has_result"], (pos == 1).astype(float), np.nan)
    df["finish_pct"] = np.where(
        df["has_result"],
        ((pos - 1) / (df["field_size"] - 1).clip(lower=1)).clip(0, 1),
        np.nan,
    )

    # Market. "sp" is the historic reference market (used for trainer/jockey
    # actual-vs-expected); "bet" is the price you could actually take.
    if "sp_decimal" in df.columns:
        df["mkt_prob_sp"] = _normalised_implied(df, "sp_decimal")
    else:
        df["mkt_prob_sp"] = np.nan
    df["bet_price"] = np.nan
    for col in reversed(PRICE_COLS):  # early_price wins, then bsp, then sp
        if col in df.columns:
            df["bet_price"] = df[col].where(df[col].notna(), df["bet_price"])
    df["mkt_prob"] = _normalised_implied(df, "bet_price")
    return df
