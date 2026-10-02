import numpy as np
from scipy.optimize import check_grad

from dundalk import backtest, features
from dundalk.model import ConditionalLogit, DundalkModel


def _toy(seed=0, races=300):
    rng = np.random.default_rng(seed)
    sizes = rng.integers(5, 12, races)
    rid = np.repeat(np.arange(races), sizes)
    X = rng.normal(size=(len(rid), 3))
    beta = np.array([1.0, -0.5, 0.0])
    u = X @ beta + rng.gumbel(size=len(rid))
    won = np.zeros(len(rid))
    start = 0
    for s in sizes:
        won[start + np.argmax(u[start:start + s])] = 1
        start += s
    return X, rid, won, beta


def test_gradient():
    X, rid, won, _ = _toy(races=40)
    m = ConditionalLogit(l2=0.5)
    starts = np.flatnonzero(np.r_[True, rid[1:] != rid[:-1]])
    sizes = np.diff(np.r_[starts, len(rid)])
    w = np.ones(len(starts))
    f = lambda b: m._objective(b, X, won, starts, sizes, w)[0]
    g = lambda b: m._objective(b, X, won, starts, sizes, w)[1]
    assert check_grad(f, g, np.array([0.3, -0.2, 0.1])) < 1e-4


def test_recovers_coefficients():
    X, rid, won, beta = _toy(races=4000)
    m = ConditionalLogit(l2=0.01).fit(X, rid, won)
    assert np.allclose(m.coef_, beta, atol=0.1)
    p = m.predict_proba(X, rid)
    assert np.allclose(np.bincount(rid, p), 1.0)


def test_end_to_end(raw, prepared, tmp_path):
    feats = features.build_features(prepared)
    preds = backtest.walk_forward(feats, retrain_months=6, min_train_days=300, verbose=False)
    rep, bets = backtest.evaluate(preds)
    # The synthetic market has blind spots, so a working model must beat it.
    assert rep["log_loss_p_model"] < rep["log_loss_market"]
    assert rep["log_loss_p_fund"] < rep["log_loss_uniform"]

    m = DundalkModel().fit(feats)
    m.save(tmp_path / "m.json")
    m2 = DundalkModel.load(tmp_path / "m.json")
    sample = DundalkModel.training_rows(feats).tail(200)
    sample = sample[sample["race_id"].isin(sample["race_id"].value_counts().index)]
    assert np.allclose(m.predict(sample)["p_model"], m2.predict(sample)["p_model"])
