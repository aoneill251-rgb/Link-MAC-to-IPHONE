import numpy as np

from dundalk.staking import StakingRules, expected_value, kelly_fraction, stake_race


def test_kelly_formula():
    # p=0.5 at evens with no commission: no edge, no bet.
    assert np.isclose(kelly_fraction(0.5, 2.0), 0.0)
    # p=0.6 at evens: Kelly = 0.2
    assert np.isclose(kelly_fraction(0.6, 2.0), 0.2)
    assert np.isclose(expected_value(0.25, 4.0), 0.0)   # fair odds
    assert np.isclose(expected_value(0.25, 5.0), 0.25)  # +25% EV


def test_caps_and_filters():
    rules = StakingRules(commission=0.0)
    p = np.array([0.40, 0.30, 0.20, 0.10])
    odds = np.array([4.0, 5.0, 2.5, 50.0])
    p_mkt = np.array([0.25, 0.20, 0.40, 0.02])
    s = stake_race(p, odds, p_mkt, 100.0, rules)
    assert s[2] == 0                      # negative EV
    assert s[3] == 0                      # beyond max_odds
    assert s.max() <= 2.0 + 1e-9          # max 2% per bet
    assert s.sum() <= 5.0 + 1e-9          # max 5% per race


def test_model_market_sanity_cap():
    rules = StakingRules(commission=0.0)
    s = stake_race(np.array([0.30]), np.array([10.0]), np.array([0.08]), 100.0, rules)
    assert s[0] == 0  # model 3.75x the market: treated as a model error
