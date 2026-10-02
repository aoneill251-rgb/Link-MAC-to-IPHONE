"""Point-in-time feature engineering.

Every feature for a runner is built from races run on earlier days only, so
the same code serves backtests and live race cards. tests/test_features.py
checks this.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .course import BAND_NAMES

SECONDS_PER_LENGTH = 0.18   # rough figure for flat racing on all-weather
MIN_PAR_RACES = 15          # races needed at a trip before speed figures are made


def _prior_cumsum(df: pd.DataFrame, keys, col: str) -> pd.Series:
    """Running total of `col` for the group in `keys`, excluding the current row."""
    vals = df[col].fillna(0)
    return vals.groupby([df[k] for k in keys]).cumsum() - vals


def _shrunk(wins, runs, prior_rate, prior_n):
    return (wins + prior_rate * prior_n) / (runs + prior_n)


def _rolling_entity(df: pd.DataFrame, key: str, window: str, mask=None, prefix=None):
    """Trailing-window strike rate and actual/expected for a trainer, jockey, etc.

    Totals are summed per day, then rolled with closed='left', so runners on
    the same day never see each other's results.
    """
    prefix = prefix or key
    d = df[[key, "date", "won", "mkt_prob_sp"]].copy()
    if mask is not None:
        d = d[mask]
    d = d[d["won"].notna()]
    d["exp"] = d["mkt_prob_sp"]
    d["exp_runs"] = d["mkt_prob_sp"].notna().astype(float)
    d["exp_wins"] = d["won"].where(d["mkt_prob_sp"].notna(), 0.0)
    daily = (d.groupby([key, "date"])
               .agg(runs=("won", "size"), wins=("won", "sum"), exp=("exp", "sum"),
                    exp_wins=("exp_wins", "sum"))
               .reset_index())

    # Every (entity, date) in the full frame needs a value, including days
    # with no runners in `mask` and race-card days with no results yet.
    targets = df[[key, "date"]].drop_duplicates()
    allrows = pd.concat([daily, targets[~targets.set_index([key, "date"]).index.isin(
        daily.set_index([key, "date"]).index)]], ignore_index=True)
    allrows = allrows.fillna({"runs": 0, "wins": 0, "exp": 0, "exp_wins": 0})
    allrows = allrows.sort_values([key, "date"])

    parts = []
    for ent, grp in allrows.groupby(key, sort=False):
        r = grp.set_index("date")[["runs", "wins", "exp", "exp_wins"]].rolling(
            window, closed="left").sum().fillna(0)
        r[key] = ent
        parts.append(r.reset_index())
    stats = pd.concat(parts, ignore_index=True)

    sr = _shrunk(stats["wins"], stats["runs"], 0.10, 30)
    # Actual/expected against SP, shrunk towards 1 (= market-neutral).
    ae = (stats["exp_wins"] + 8.0) / (stats["exp"] + 8.0)
    stats[f"{prefix}_sr"] = sr
    stats[f"{prefix}_log_ae"] = np.log(ae)
    stats[f"{prefix}_runs"] = np.log1p(stats["runs"])
    out = df[[key, "date"]].merge(
        stats[[key, "date", f"{prefix}_sr", f"{prefix}_log_ae", f"{prefix}_runs"]],
        on=[key, "date"], how="left")
    out.index = df.index
    return out[[f"{prefix}_sr", f"{prefix}_log_ae", f"{prefix}_runs"]]


def _speed_figures(df: pd.DataFrame) -> pd.Series:
    """A speed figure for each run, in lengths, against the course/trip par.

    Par = mean winning speed at that course and trip from earlier days only.
    The figure is how far ahead of par the runner finished, so 0 = par and
    +5 = five lengths faster. Each runner's time is the winning time plus
    beaten lengths.
    """
    if not {"win_time_s", "beaten_lengths"}.issubset(df.columns):
        return pd.Series(np.nan, index=df.index)

    metres = df["distance_f"] * 201.168
    runner_time = df["win_time_s"] + df["beaten_lengths"].clip(0, 30).fillna(30) * SECONDS_PER_LENGTH
    speed = metres / runner_time

    winners = df[(df["finish_pos"] == 1) & df["win_time_s"].notna()].copy()
    winners["speed"] = metres[winners.index] / winners["win_time_s"]
    winners["trip"] = winners["course"].astype(str) + "|" + winners["distance_f"].round(1).astype(str)
    winners = winners.drop_duplicates("race_id")
    daily = winners.groupby(["trip", "date"])["speed"].agg(["sum", "count"]).reset_index()
    daily = daily.sort_values(["trip", "date"])
    daily["cum_sum"] = daily.groupby("trip")["sum"].cumsum() - daily["sum"]
    daily["cum_n"] = daily.groupby("trip")["count"].cumsum() - daily["count"]
    daily["par"] = np.where(daily["cum_n"] >= MIN_PAR_RACES, daily["cum_sum"] / daily["cum_n"].clip(lower=1), np.nan)

    trip = df["course"].astype(str) + "|" + df["distance_f"].round(1).astype(str)
    key = pd.DataFrame({"trip": trip, "date": df["date"]})
    merged = pd.merge_asof(
        key.reset_index().sort_values("date"),
        daily[["trip", "date", "par"]].sort_values("date"),
        on="date", by="trip", direction="backward", allow_exact_matches=True,
    ).set_index("index").sort_index()
    # A par row dated today was built from earlier days only, so it is safe.
    par = merged["par"]
    seconds_per_metre_at_par = 1.0 / par
    lengths = (speed - par) * runner_time * seconds_per_metre_at_par / SECONDS_PER_LENGTH
    # A plain race-time figure is noisy, so clip the extremes.
    return lengths.clip(-40, 25)


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add model features to a prepared results frame (see data.prepare)."""
    df = df.copy()
    df = df.sort_values(["horse_id", "date", "off_time"]).copy()
    g = df.groupby("horse_id", sort=False)

    # --- Horse form -----------------------------------------------------
    df["n_runs"] = g.cumcount()
    df["log_n_runs"] = np.log1p(df["n_runs"])
    df["debut"] = (df["n_runs"] == 0).astype(float)
    prev_date = g["date"].shift(1)
    days = (df["date"] - prev_date).dt.days
    df["log_days"] = np.log1p(days)
    df["long_break"] = (days > 90).astype(float)
    df["quick_return"] = (days <= 7).astype(float)

    fp_prev = g["finish_pct"].shift(1)
    df["last_fp"] = fp_prev
    df["avg_fp_3"] = fp_prev.groupby(df["horse_id"]).transform(lambda s: s.rolling(3, min_periods=1).mean())
    df["avg_fp_6"] = fp_prev.groupby(df["horse_id"]).transform(lambda s: s.rolling(6, min_periods=1).mean())

    wins_prior = _prior_cumsum(df, ["horse_id"], "won")
    df["career_sr"] = _shrunk(wins_prior, df["n_runs"], 0.08, 6)
    df["won_last"] = g["won"].shift(1)

    df["_dk_won"] = df["won"] * df["is_dundalk"]
    dk_runs = _prior_cumsum(df, ["horse_id"], "is_dundalk")
    dk_wins = _prior_cumsum(df, ["horse_id"], "_dk_won")
    df["dk_runs"] = np.log1p(dk_runs)
    df["dk_sr"] = _shrunk(dk_wins, dk_runs, 0.08, 4)
    df["_dk_fp"] = df["finish_pct"] * df["is_dundalk"]
    dk_fp_sum = _prior_cumsum(df, ["horse_id"], "_dk_fp")
    df["dk_avg_fp"] = np.where(dk_runs > 0, dk_fp_sum / dk_runs.clip(lower=1), np.nan)

    # Course-and-distance: Dundalk wins in today's distance band.
    df["_one"] = 1.0
    cd_wins = _prior_cumsum(df, ["horse_id", "dist_band"], "_dk_won")
    df["cd_winner"] = (cd_wins > 0).astype(float)
    band_runs = _prior_cumsum(df, ["horse_id", "dist_band"], "_one")
    band_wins = _prior_cumsum(df, ["horse_id", "dist_band"], "won")
    df["band_sr"] = _shrunk(band_wins, band_runs, 0.08, 4)

    # All-weather vs turf form (for horses switching surface).
    df["_aw_fp"] = df["finish_pct"] * df["is_aw"]
    aw_runs = _prior_cumsum(df, ["horse_id"], "is_aw")
    df["aw_avg_fp"] = np.where(aw_runs > 0, _prior_cumsum(df, ["horse_id"], "_aw_fp") / aw_runs.clip(lower=1), np.nan)
    df["aw_debut"] = ((aw_runs == 0) & (df["n_runs"] > 0)).astype(float)

    prev_dist = g["distance_f"].shift(1)
    df["dist_change"] = np.log(df["distance_f"] / prev_dist)
    df["abs_dist_change"] = df["dist_change"].abs()

    if "official_rating" in df.columns:
        df["or_change"] = df["official_rating"] - g["official_rating"].shift(1)
    if "race_class" in df.columns:
        df["class_change"] = df["race_class"] - g["race_class"].shift(1)
    if "beaten_lengths" in df.columns:
        bl = df["beaten_lengths"].clip(0, 25)
        df["_bl"] = bl
        bl_prev = df.groupby("horse_id")["_bl"].shift(1)
        df["last_bl"] = bl_prev
        df["avg_bl_3"] = bl_prev.groupby(df["horse_id"]).transform(lambda s: s.rolling(3, min_periods=1).mean())

    # --- Speed figures --------------------------------------------------
    df["_fig"] = _speed_figures(df)
    fig_prev = df.groupby("horse_id")["_fig"].shift(1)
    df["last_fig"] = fig_prev
    df["best_fig_3"] = fig_prev.groupby(df["horse_id"]).transform(lambda s: s.rolling(3, min_periods=1).max())
    df["avg_fig_5"] = fig_prev.groupby(df["horse_id"]).transform(lambda s: s.rolling(5, min_periods=1).mean())

    # --- Pace / run style ------------------------------------------------
    if "early_pos" in df.columns:
        df["_early_pct"] = ((df["early_pos"] - 1) / (df["field_size"] - 1).clip(lower=1)).clip(0, 1)
        ep_prev = df.groupby("horse_id")["_early_pct"].shift(1)
        df["pace_style"] = ep_prev.groupby(df["horse_id"]).transform(lambda s: s.rolling(4, min_periods=1).mean())

    df = df.sort_values(["date", "off_time", "race_id", "draw"]).copy()

    def race_agg(col, how):
        return df.groupby("race_id")[col].transform(how)

    # --- Race-relative features ---------------------------------------
    df["draw_pct"] = ((df["draw"] - 1) / (df["field_size"] - 1).clip(lower=1)).clip(0, 1)
    for band in BAND_NAMES:
        df[f"draw_{band}"] = (df["draw_pct"] - 0.5) * (df["dist_band"] == band)
    df["draw_big_field"] = (df["draw_pct"] - 0.5) * (df["field_size"] >= 12) * df["dist_band"].isin(["sprint", "mile"])

    def rel(col):
        return df[col] - race_agg(col, "mean")

    if "official_rating" in df.columns:
        df["or_rel"] = rel("official_rating")
        df["or_vs_top"] = df["official_rating"] - race_agg("official_rating", "max")
    if "weight_lbs" in df.columns:
        eff = df["weight_lbs"] - df.get("jockey_claim", pd.Series(0, index=df.index)).fillna(0)
        df["_eff_wt"] = eff
        df["weight_rel"] = rel("_eff_wt")
    if "age" in df.columns:
        df["age_rel"] = rel("age")
    for col in ("best_fig_3", "avg_fig_5", "last_fig"):
        df[f"{col}_rel"] = rel(col)

    if "pace_style" in df.columns:
        front = (df["pace_style"] <= 0.25).astype(float)
        n_front = front.groupby(df["race_id"]).transform("sum")
        df["front_runner"] = front
        df["lone_speed"] = ((front == 1) & (n_front == 1)).astype(float)
        df["pace_pressure"] = n_front / df["field_size"]
        df["front_sprint"] = front * (df["dist_band"] == "sprint")

    # --- Connections ------------------------------------------------------
    if "trainer" in df.columns:
        df = df.join(_rolling_entity(df, "trainer", "365D"))
        df = df.join(_rolling_entity(df, "trainer", "30D", prefix="trainer30"))
        df = df.join(_rolling_entity(df, "trainer", "730D", mask=df["is_dundalk"] == 1, prefix="trainer_dk"))
    if "jockey" in df.columns:
        df = df.join(_rolling_entity(df, "jockey", "365D"))
        df = df.join(_rolling_entity(df, "jockey", "730D", mask=df["is_dundalk"] == 1, prefix="jockey_dk"))
    if {"trainer", "jockey"}.issubset(df.columns):
        df["_tj"] = df["trainer"] + "|" + df["jockey"]
        df = df.join(_rolling_entity(df, "_tj", "730D", prefix="tj"))

    df = df.drop(columns=[c for c in df.columns if c.startswith("_")])
    return df


# Candidate model inputs. Any that cannot be built from your data (for
# example no beaten_lengths column) are skipped.
FEATURES = [
    # horse form
    "log_n_runs", "debut", "log_days", "long_break", "quick_return",
    "last_fp", "avg_fp_3", "avg_fp_6", "career_sr", "won_last",
    "last_bl", "avg_bl_3",
    # course / surface / trip
    "dk_runs", "dk_sr", "dk_avg_fp", "cd_winner", "band_sr", "aw_avg_fp", "aw_debut",
    "dist_change", "abs_dist_change",
    # draw (estimated separately for each distance band)
    "draw_sprint", "draw_mile", "draw_middle", "draw_staying", "draw_big_field",
    # ratings, weights, class
    "or_rel", "or_vs_top", "or_change", "weight_rel", "age_rel", "class_change",
    # speed figures
    "best_fig_3_rel", "avg_fig_5_rel", "last_fig_rel",
    # pace
    "pace_style", "front_runner", "lone_speed", "pace_pressure", "front_sprint",
    # connections
    "trainer_sr", "trainer_log_ae", "trainer30_sr", "trainer30_log_ae",
    "trainer_dk_sr", "trainer_dk_log_ae",
    "jockey_sr", "jockey_log_ae", "jockey_dk_sr", "jockey_dk_log_ae",
    "tj_sr", "tj_log_ae",
]


def available_features(df: pd.DataFrame) -> list[str]:
    return [f for f in FEATURES if f in df.columns and df[f].notna().any() and df[f].nunique() > 1]
