import numpy as np
import pandas as pd

from dundalk import data, features


def test_no_lookahead(raw):
    """Changing results on day D must not change any feature on or before D."""
    dk_days = sorted(raw.loc[raw["course"] == "Dundalk", "date"].unique())
    day = dk_days[len(dk_days) // 2]
    base = features.build_features(data.prepare(raw))

    rng = np.random.default_rng(0)
    tampered = raw.copy()
    on_day = tampered["date"] == day
    for rid, idx in tampered[on_day].groupby("race_id").groups.items():
        tampered.loc[idx, "finish_pos"] = rng.permutation(len(idx)) + 1
        tampered.loc[idx, "beaten_lengths"] = rng.uniform(0, 20, len(idx))
        tampered.loc[idx, "early_pos"] = rng.permutation(len(idx)) + 1
    tampered.loc[on_day, "win_time_s"] = tampered.loc[on_day, "win_time_s"] + 3
    tampered.loc[on_day, "sp_decimal"] = rng.uniform(2, 30, on_day.sum())
    tampered.loc[on_day, "early_price"] = rng.uniform(2, 30, on_day.sum())
    new = features.build_features(data.prepare(tampered))

    cols = features.available_features(base)
    key = ["race_id", "horse_id"]
    a = base[base["date"] <= day].set_index(key)[cols].sort_index()
    b = new[new["date"] <= day].set_index(key)[cols].sort_index()
    pd.testing.assert_frame_equal(a, b)
    # ...while later rows do see the change.
    later_a = base[base["date"] > day].set_index(key)[cols].sort_index()
    later_b = new[new["date"] > day].set_index(key)[cols].sort_index()
    assert not later_a.equals(later_b)


def test_parse_odds():
    assert data.parse_odds("5/2") == 3.5
    assert data.parse_odds("Evs") == 2.0
    assert data.parse_odds("11/4F") == 3.75
    assert data.parse_odds(4.2) == 4.2
    assert np.isnan(data.parse_odds("NR"))


def test_market_probs_sum_to_one(prepared):
    s = prepared.groupby("race_id")["mkt_prob"].sum()
    assert np.allclose(s, 1.0)
