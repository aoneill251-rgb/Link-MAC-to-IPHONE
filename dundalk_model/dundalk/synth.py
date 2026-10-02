"""SYNTHETIC Dundalk-like results, for testing the pipeline only.

The generator builds a horse population with hidden ability, trip
preference and Polytrack aptitude, trainers whose form changes over time,
jockeys, a low-draw bias at Dundalk, a fitness penalty after a break, and a
market that sees the truth with noise and underrates some factors.

Because the market's blind spots are written into the generator, a model
WILL find an edge here. That proves the code works, not that Dundalk can
be beaten. Only a backtest on real data with real prices can show that.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TURF_COURSES = ["Leopardstown", "Curragh", "Naas", "Navan", "Fairyhouse", "Gowran Park", "Cork"]
DK_TRIPS = [5.0, 6.0, 7.0, 8.0, 10.7, 12.0, 16.0]
DK_TRIP_P = [0.16, 0.22, 0.22, 0.20, 0.10, 0.06, 0.04]
TURF_TRIPS = [5.0, 6.0, 7.0, 8.0, 10.0, 12.0, 14.0]
DRAW_BIAS = {"sprint": 0.9, "mile": 0.6, "middle": 0.25, "staying": 0.0}  # cost of the widest draw
PAR_SPEED = 16.6  # metres per second


def _band(f):
    return "sprint" if f <= 6.5 else "mile" if f <= 8.5 else "middle" if f <= 12.5 else "staying"


def generate(years: int = 6, seed: int = 7, start: str = "2019-01-01") -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n_trainers, n_jockeys = 120, 60
    tr_skill = rng.normal(0, 0.25, n_trainers)
    tr_size = rng.pareto(1.2, n_trainers) + 1
    tr_size /= tr_size.sum()
    jk_skill = rng.normal(0, 0.15, n_jockeys)
    jk_size = rng.pareto(1.0, n_jockeys) + 1
    jk_size /= jk_size.sum()

    # Horse population: grows each year with a new crop.
    H = {k: [] for k in ("ability", "dopt", "poly", "trainer", "birth", "style", "last", "runs", "rating")}

    def add_horses(n, year, spread_ages=False):
        H["ability"].extend(rng.normal(0, 1, n))
        H["dopt"].extend(np.exp(rng.uniform(np.log(5), np.log(16), n)))
        H["poly"].extend(rng.normal(0, 0.35, n))
        H["trainer"].extend(rng.choice(n_trainers, n, p=tr_size))
        extra = rng.integers(0, 6, n) if spread_ages else np.zeros(n, int)
        H["birth"].extend(list(year - 2 - extra))
        H["style"].extend(rng.beta(2, 2, n))
        H["last"].extend([np.nan] * n)
        H["runs"].extend([0] * n)
        H["rating"].extend([np.nan] * n)

    start = pd.Timestamp(start)
    add_horses(1600, start.year, spread_ages=True)
    rows = []
    race_no = 0
    tr_form = np.zeros(n_trainers)
    days = pd.date_range(start, start + pd.DateOffset(years=years) - pd.Timedelta(days=1), freq="D")
    for day in days:
        if day.day == 1:
            tr_form = 0.6 * tr_form + rng.normal(0, 0.25, n_trainers)
        if day.month == 3 and day.day == 1:
            add_horses(350, day.year)
        meetings = []
        if day.dayofweek == 4 or (day.dayofweek == 2 and day.month in (1, 2, 3, 10, 11, 12)):
            meetings.append("Dundalk")
        if day.dayofweek in (5, 6) and day.month in range(3, 11):
            meetings.append(TURF_COURSES[rng.integers(len(TURF_COURSES))])
        for course in meetings:
            dk = course == "Dundalk"
            for k in range(8):
                race_no += 1
                rows.extend(_one_race(rng, H, day, course, dk, k, race_no, tr_skill, tr_form, jk_skill, jk_size))
    df = pd.DataFrame(rows)
    return df


def _one_race(rng, H, day, course, dk, k, race_no, tr_skill, tr_form, jk_skill, jk_size):
    ability = np.array(H["ability"])
    birth = np.array(H["birth"])
    age = day.year - birth
    since = np.nan_to_num(day.toordinal() - np.array(H["last"]), nan=999.0)
    alive = (age >= 2) & (age <= 9) & (since >= 10)
    trips, tp = (DK_TRIPS, DK_TRIP_P) if dk else (TURF_TRIPS, None)
    dist = float(rng.choice(trips, p=tp))
    centre = rng.normal(0, 0.9)
    maiden = rng.random() < 0.25
    runs = np.array(H["runs"])
    dopt = np.array(H["dopt"])
    cand = alive & (np.abs(ability - centre) < 0.8) & (np.abs(np.log(dist / dopt)) < 0.45)
    cand &= (runs < 4) if maiden else (runs >= 2)
    idx = np.flatnonzero(cand)
    field = int(rng.integers(7, 15))
    if len(idx) < 5:
        return []
    # Horses that have been off longer are keener to run.
    w = np.minimum(since[idx], 120) + 5.0
    pick = rng.choice(idx, size=min(field, len(idx)), replace=False, p=w / w.sum())
    n = len(pick)
    draws = rng.permutation(n) + 1
    draw_pct = (draws - 1) / max(n - 1, 1)
    band = _band(dist)

    trainer = np.array(H["trainer"])[pick]
    jockey = rng.choice(len(jk_skill), n, p=jk_size)
    rating = np.array(H["rating"])[pick]
    handicap = (not maiden) and np.all(np.isfinite(rating))
    if handicap:
        weight = np.clip(140 - (np.nanmax(rating) - rating), 112, 140)
    else:
        weight = np.full(n, 133.0) - 2 * (age[pick] == 2)
    claim = np.where(rng.random(n) < 0.15, rng.choice([3, 5, 7], n), 0)

    ab = ability[pick]
    s = since[pick]
    fitness = np.where(s > 120, -0.45, np.where(s > 60, -0.15, 0.0))
    trip_fit = -1.6 * np.abs(np.log(dist / dopt[pick]))
    poly = np.array(H["poly"])[pick] * dk
    draw_eff = -DRAW_BIAS[band] * draw_pct * (1.3 if n >= 12 else 1.0) * dk
    style = np.array(H["style"])[pick]
    pace_eff = (0.35 * (style < 0.3) - 0.1) * (band == "sprint") * dk
    conn = tr_skill[trainer] + tr_form[trainer] + jk_skill[jockey]
    wt_eff = -(weight - claim - np.mean(weight - claim)) / 15.0
    mu = 1.5 * (ab + trip_fit + poly + fitness + wt_eff) + draw_eff + pace_eff + conn

    # The market sees mu with noise and underrates draw, pace, trainer form
    # and Polytrack aptitude.
    blind = 0.6 * draw_eff + 0.5 * pace_eff + 0.6 * tr_form[trainer] + 0.6 * poly
    def book(noise_sd, over, fl):
        m = mu - blind + rng.normal(0, noise_sd, n)
        p = np.exp(fl * (m - m.max())); p /= p.sum()
        return np.round(np.clip(1 / (p * over), 1.05, 200), 2)
    early = book(0.40, 1.04, 1.0)
    sp = book(0.28, 1.17, 0.9)   # bookmaker margin and favourite-longshot bias

    perf = mu + rng.gumbel(0, 1, n)
    order = np.argsort(-perf)
    pos = np.empty(n, int)
    pos[order] = np.arange(1, n + 1)
    beaten = np.clip((perf.max() - perf) * 2.2, 0, 40)
    metres = dist * 201.168
    win_time = metres / (PAR_SPEED * (1 + 0.004 * (perf.max() - 3) / 1.5)) + rng.normal(0, 0.4)
    early_pos = np.argsort(np.argsort(style + rng.normal(0, 0.15, n))) + 1

    rows = []
    off = f"{17 + k // 2:02d}:{(k % 2) * 30:02d}"
    for j, h in enumerate(pick):
        rows.append({
            "race_id": f"R{race_no:06d}", "date": day.date().isoformat(), "off_time": off,
            "course": course, "surface": "AW" if dk else "Turf", "distance_f": dist,
            "race_type": "Maiden" if maiden else ("Handicap" if handicap else "Conditions"),
            "horse_id": f"H{h:05d}", "horse_name": f"Horse {h}", "age": int(age[h]),
            "draw": int(draws[j]), "weight_lbs": float(weight[j]), "jockey_claim": int(claim[j]),
            "official_rating": rating[j], "trainer": f"T{trainer[j]:03d}", "jockey": f"J{jockey[j]:03d}",
            "sp_decimal": sp[j], "early_price": early[j], "finish_pos": int(pos[j]),
            "beaten_lengths": round(float(beaten[j]), 2), "win_time_s": round(float(win_time), 2),
            "early_pos": int(early_pos[j]),
        })
        # Update the horse: ability drifts, the handicapper reacts to the result.
        H["ability"][h] += rng.normal(0.02 if H["runs"][h] < 6 else -0.01, 0.08)
        H["last"][h] = day.toordinal()
        H["runs"][h] += 1
        H["rating"][h] = round(70 + 15 * (H["ability"][h] + rng.normal(0, 0.15)))
    return rows


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "synthetic_results.csv"
    generate().to_csv(out, index=False)
    print(f"wrote {out}")
