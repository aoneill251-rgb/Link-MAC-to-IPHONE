"""Two-stage Benter-style win-probability model.

Stage 1, "fundamental": a conditional logit over runners in each race.
    P(i wins) = exp(x_i . b) / sum_j exp(x_j . b)
This models the race as a whole: probabilities in a race always sum to 1,
and only differences between runners matter.

Stage 2, "blend": a second conditional logit on
    [log p_fundamental, log p_market]
fitted on a later stretch of the data that stage 1 has not seen. The
market contains information the features miss (stable whispers, late
money), and the fundamental model contains information the market
underweights. The blend weights are learned, not hand-set. This was the
key idea in Benter (1994), "Computer Based Horse Race Handicapping and
Wagering Systems".
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from .features import available_features


def _race_layout(race_ids: np.ndarray):
    """Check the rows are grouped by race and return each race's start and size."""
    change = np.r_[True, race_ids[1:] != race_ids[:-1]]
    starts = np.flatnonzero(change)
    sizes = np.diff(np.r_[starts, len(race_ids)])
    if len(pd.unique(race_ids)) != len(starts):
        raise ValueError("rows must be grouped so each race is contiguous")
    return starts, sizes


def _race_softmax(u, starts, sizes):
    m = np.repeat(np.maximum.reduceat(u, starts), sizes)
    e = np.exp(u - m)
    s = np.add.reduceat(e, starts)
    p = e / np.repeat(s, sizes)
    lse = np.log(s) + m[starts]
    return p, lse


class ConditionalLogit:
    """Multinomial logit where each race is its own choice set."""

    def __init__(self, l2: float = 1.0):
        self.l2 = l2
        self.coef_: np.ndarray | None = None

    def _objective(self, beta, X, y, starts, sizes, w_race):
        u = X @ beta
        p, lse = _race_softmax(u, starts, sizes)
        ll_race = np.add.reduceat(y * u, starts) - lse
        nll = -np.sum(w_race * ll_race) + 0.5 * self.l2 * beta @ beta
        grad = -X.T @ (np.repeat(w_race, sizes) * (y - p)) + self.l2 * beta
        return nll, grad

    def fit(self, X, race_ids, won, race_weights=None):
        X = np.asarray(X, float)
        race_ids = np.asarray(race_ids)
        starts, sizes = _race_layout(race_ids)
        y = np.asarray(won, float)
        # Dead heats: split the win between the horses.
        tot = np.add.reduceat(y, starts)
        if np.any(tot <= 0):
            raise ValueError("every training race needs a winner")
        y = y / np.repeat(tot, sizes)
        w = np.ones(len(starts)) if race_weights is None else np.asarray(race_weights, float)
        res = minimize(self._objective, np.zeros(X.shape[1]), args=(X, y, starts, sizes, w),
                       jac=True, method="L-BFGS-B", options={"maxiter": 2000})
        self.coef_ = res.x
        self.converged_ = bool(res.success)
        return self

    def predict_proba(self, X, race_ids):
        starts, sizes = _race_layout(np.asarray(race_ids))
        p, _ = _race_softmax(np.asarray(X, float) @ self.coef_, starts, sizes)
        return p


def race_log_loss(p, won, race_ids):
    """Mean over races of -log P(winner). Lower is better."""
    df = pd.DataFrame({"p": np.clip(p, 1e-9, 1), "won": won, "race": race_ids})
    w = df[df["won"] == 1].drop_duplicates("race")
    return float(-np.log(w["p"]).mean())


class DundalkModel:
    def __init__(self, features=None, l2=2.0, blend_l2=0.1, blend_frac=0.3,
                 half_life_days=None):
        self.features = features
        self.l2 = l2
        self.blend_l2 = blend_l2
        self.blend_frac = blend_frac
        self.half_life_days = half_life_days

    # -- design matrix ----------------------------------------------------
    def _fit_scaler(self, df):
        feats = self.features or available_features(df)
        self.features_ = feats
        self.means_ = {f: float(df[f].mean()) for f in feats}
        stds = {f: float(df[f].std()) for f in feats}
        self.stds_ = {f: (v if np.isfinite(v) and v > 0 else 1.0) for f, v in stds.items()}
        self.na_cols_ = [f for f in feats if df[f].isna().mean() > 0.01]

    def _design(self, df) -> np.ndarray:
        cols = []
        for f in self.features_:
            v = df[f] if f in df.columns else pd.Series(np.nan, index=df.index)
            cols.append(((v - self.means_[f]) / self.stds_[f]).fillna(0.0).to_numpy())
        for f in self.na_cols_:
            v = df[f] if f in df.columns else pd.Series(np.nan, index=df.index)
            cols.append(v.isna().astype(float).to_numpy())
        return np.column_stack(cols)

    def column_names(self):
        return list(self.features_) + [f"{f}__missing" for f in self.na_cols_]

    def _weights(self, df):
        if not self.half_life_days:
            return None
        race_dates = df.drop_duplicates("race_id")["date"]
        age = (race_dates.max() - race_dates).dt.days.to_numpy()
        return 0.5 ** (age / self.half_life_days)

    def _fit_stage1(self, df):
        X = self._design(df)
        return ConditionalLogit(self.l2).fit(X, df["race_id"].to_numpy(), df["won"].to_numpy(),
                                             self._weights(df))

    @staticmethod
    def _blend_X(p_fund, p_mkt=None):
        cols = [np.log(np.clip(p_fund, 1e-6, 1))]
        if p_mkt is not None:
            cols.append(np.log(np.clip(p_mkt, 1e-6, 1)))
        return np.column_stack(cols)

    # -- public API -------------------------------------------------------
    @staticmethod
    def training_rows(df):
        """Resulted Dundalk races with a winner."""
        d = df[(df["is_dundalk"] == 1) & df["has_result"]]
        has_winner = d.groupby("race_id")["won"].transform("sum") > 0
        return d[has_winner]

    def fit(self, df):
        train = self.training_rows(df).sort_values(["date", "off_time", "race_id", "draw"])
        self._fit_scaler(train)

        # Stage 2 needs stage-1 probabilities the model has not trained on,
        # so hold out the most recent part of the training period.
        race_dates = train.drop_duplicates("race_id")["date"].sort_values()
        cutoff = race_dates.iloc[int(len(race_dates) * (1 - self.blend_frac))]
        early, late = train[train["date"] < cutoff], train[train["date"] >= cutoff]
        s1_early = self._fit_stage1(early)
        p_late = s1_early.predict_proba(self._design(late), late["race_id"].to_numpy())

        rid = late["race_id"].to_numpy()
        self.calib_ = ConditionalLogit(self.blend_l2).fit(self._blend_X(p_late), rid, late["won"])
        priced = late["mkt_prob"].notna().groupby(late["race_id"]).transform("all").to_numpy()
        self.blend_ = None
        if priced.sum() > 0:
            lp = late[priced]
            self.blend_ = ConditionalLogit(self.blend_l2).fit(
                self._blend_X(p_late[priced], lp["mkt_prob"].to_numpy()),
                lp["race_id"].to_numpy(), lp["won"])

        self.stage1_ = self._fit_stage1(train)
        self.fit_stats_ = {
            "train_races": int(train["race_id"].nunique()),
            "train_start": str(train["date"].min().date()),
            "train_end": str(train["date"].max().date()),
            "blend_races": int(late["race_id"].nunique()),
        }
        return self

    def predict(self, df) -> pd.DataFrame:
        """Return p_fund, p_mkt and p_model (final) for every runner in df."""
        df = df.sort_values(["date", "off_time", "race_id", "draw"])
        rid = df["race_id"].to_numpy()
        p_fund = self.stage1_.predict_proba(self._design(df), rid)
        p = self.calib_.predict_proba(self._blend_X(p_fund), rid)
        if self.blend_ is not None:
            priced = df["mkt_prob"].notna().groupby(df["race_id"]).transform("all").to_numpy()
            if priced.any():
                sub = df[priced]
                p[priced] = self.blend_.predict_proba(
                    self._blend_X(p_fund[priced], sub["mkt_prob"].to_numpy()), sub["race_id"].to_numpy())
        out = df.copy()
        out["p_fund"] = p_fund
        out["p_mkt"] = df["mkt_prob"]
        out["p_model"] = p
        return out

    def coefficients(self) -> pd.DataFrame:
        coef = pd.DataFrame({"feature": self.column_names(), "coef": self.stage1_.coef_})
        coef["abs"] = coef["coef"].abs()
        return coef.sort_values("abs", ascending=False).drop(columns="abs").reset_index(drop=True)

    def blend_weights(self) -> dict:
        out = {"fundamental_only_temperature": float(self.calib_.coef_[0])}
        if self.blend_ is not None:
            out["blend_fundamental"] = float(self.blend_.coef_[0])
            out["blend_market"] = float(self.blend_.coef_[1])
        return out

    # -- persistence (JSON, so it is readable and safe to load) ---------
    def save(self, path):
        state = {
            "features": self.features_, "means": self.means_, "stds": self.stds_,
            "na_cols": self.na_cols_, "l2": self.l2,
            "stage1": self.stage1_.coef_.tolist(), "calib": self.calib_.coef_.tolist(),
            "blend": None if self.blend_ is None else self.blend_.coef_.tolist(),
            "fit_stats": self.fit_stats_,
        }
        with open(path, "w") as fh:
            json.dump(state, fh, indent=2)

    @classmethod
    def load(cls, path):
        with open(path) as fh:
            s = json.load(fh)
        m = cls(features=s["features"], l2=s["l2"])
        m.features_, m.means_, m.stds_, m.na_cols_ = s["features"], s["means"], s["stds"], s["na_cols"]
        m.stage1_ = ConditionalLogit(); m.stage1_.coef_ = np.array(s["stage1"])
        m.calib_ = ConditionalLogit(); m.calib_.coef_ = np.array(s["calib"])
        m.blend_ = None
        if s["blend"] is not None:
            m.blend_ = ConditionalLogit(); m.blend_.coef_ = np.array(s["blend"])
        m.fit_stats_ = s.get("fit_stats", {})
        return m
