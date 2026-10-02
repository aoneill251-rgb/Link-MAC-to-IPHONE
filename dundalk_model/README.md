# Dundalk Racing Betting Model

A win-probability and staking model for flat racing at Dundalk, Ireland's
all-weather (Polytrack) track. It uses the method behind the most
successful computer betting syndicates (Benter, 1994):

1. **Point-in-time features** built only from races before the day being
   predicted. A test checks this.
2. **Fundamental model**: a *conditional logit* that compares runners
   within each race, so probabilities always sum to 100%.
3. **Market blend**: a second model learns how much weight to give the
   fundamental model against the betting market. The market is very
   efficient, so the edge comes from combining the two, not replacing one
   with the other.
4. **Fractional Kelly staking** with hard caps per bet and per race, plus
   filters on odds range, minimum edge, and model-vs-market disagreement.
5. **Walk-forward backtest**: retrain every few months using only the past,
   then report log loss against the market and ROI with a bootstrap 95%
   confidence interval.

## What the model looks at

| Group | Features |
|---|---|
| Form | recent finishing positions (last 1/3/6), beaten lengths, win rate, won last time, runs so far |
| Fitness | days since last run, long break (>90 days), quick return (≤7 days) |
| Dundalk & surface | Dundalk runs/win rate/average finish, course-and-distance winner, all-weather form, first time on all-weather |
| Trip | change in distance, win rate in today's distance band |
| **Draw** | draw position estimated **separately** for sprint/mile/middle/staying trips, plus a big-field (12+) term |
| Ratings & weight | official rating vs field and vs top-rated, rating change, effective weight (after claim) vs field, age |
| Speed figures | lengths faster/slower than course-and-trip par (best of last 3, average of last 5, last) |
| Pace | run style from early positions, lone front-runner, pace pressure in the field, front-runners in sprints |
| Connections | trainer and jockey strike rate and **actual-vs-expected** (A/E vs SP) over 365 days, trainer over the last 30 days, trainer and jockey at Dundalk, trainer/jockey combination |

Missing data is handled automatically (missing-value flags), and features
your data can't supply are skipped.

## Quick start

```bash
cd dundalk_model
pip install -r requirements.txt

# 1. Try it on SYNTHETIC data (no real data needed)
python -m dundalk.cli synth --out synthetic_results.csv
python -m dundalk.cli backtest --results synthetic_results.csv

# 2. With real data
python -m dundalk.cli backtest --results data/results.csv --out-dir reports
python -m dundalk.cli train    --results data/results.csv --model model.json
python -m dundalk.cli predict  --results data/results.csv --card data/today.csv \
                               --model model.json --bank 500
```

`predict` prints each race with the model's probability, fair odds and the
current price, then lists recommended bets and stakes. Only bet when the
price on offer is at or above the listed `odds`.

Staking options (all commands that bet): `--kelly 0.25`,
`--commission 0.02` (use 0 for a bookmaker), `--min-edge 0.05`,
`--min-odds 2`, `--max-odds 21`.

Run the tests with `python -m pytest tests`.

## Data you need

One row per runner. See `templates/results_template.csv` and
`templates/card_template.csv`.

**Required:** `race_id, date, course, distance_f, horse_id, draw, finish_pos`

**Strongly recommended:** `sp_decimal`, `early_price`, `official_rating`,
`weight_lbs`, `jockey_claim`, `trainer`, `jockey`, `beaten_lengths`,
`win_time_s`, `early_pos`, `off_time`, `surface`, `age`.

- Include **all runs** (turf, UK all-weather) for horses that run at
  Dundalk. Only Dundalk races are modelled, but form elsewhere feeds the
  features.
- Use at least 3 years of data; 5+ is better.
- Odds can be decimal or fractional (`5/2`, `Evs`, `11/4F`).
- `early_price` should be a price you could really have taken, e.g. the
  Betfair price 5–10 minutes before the off. Without it the backtest falls
  back to BSP/SP, which is **optimistic**: SP is only known at the off.
- Non-finishers: leave `finish_pos` blank or 0 (they count as last). Remove
  non-runners.

Where to get it: Betfair's historical data service (prices),
Horse Racing Ireland results, or a paid data provider such as Proform,
Timeform or Racing Post data. Check each source's terms before scraping or
redistributing.

## At The Races form guides

The free ATR "PDF Form Guide" for a Dundalk meeting has the full card plus
each runner's last six runs (SP, position, draw, beaten distance, rating,
running comment). Import one with:

```bash
python -m dundalk.cli atr --pdf 20261002dunallcardsatrform...pdf
```

This prints a form digest for every race: forecast price, rating changes,
rating vs last winning mark, days off, recent form, lengths beaten,
Dundalk and all-weather record, and running style (from the comments).
It also appends the card and the past runs to `data/atr_cards.csv` and
`data/atr_history.csv`.

One guide is **not enough to train the model**. Its past-run lines show
only that day's runners, not the rest of each field. Importing the guide
for every Dundalk meeting builds the dataset up, because each new guide
fills in more runners from earlier Dundalk races. The proper route to a
trained model is still a full results history with prices (see "Data you
need").

The parser needs `pdftotext` (poppler-utils). The PDFs are At The Races'
copyright: keep them and the extracted data for personal use, out of
public repositories (`data/` is git-ignored).

## Reading the backtest

```
Probability quality (lower log loss = better):
  fundamental model : log loss 2.2286  R2 0.0406
  final (blended)   : log loss 2.1307  R2 0.0827
  market alone      : log loss 2.1382  R2 0.0795
  -> blended model BEATS the market's probabilities
Betting (level bank of 100 points):
  bets 4540, winners 471 (10.4%), avg odds 13.29
  turnover 2084.3, profit +440.2, ROI +21.1%  (95% CI +8.9% to +33.5%)
```

That output is from **synthetic data**. The generator gives its market
deliberate blind spots (draw, pace, trainer form, Polytrack aptitude), so
it shows the pipeline can find an edge where one exists. It says nothing
about real Dundalk racing.

On real data, look for these in order:

1. **Blended log loss below the market's.** If it isn't, nothing else
   matters: the model adds no information and any profit is luck.
2. **ROI confidence interval clear of zero.** Racing returns are very
   noisy. A +10% ROI over a few hundred bets is easily luck.
3. **Consistency by year.** One great year and three flat years is a
   warning sign.
4. **Closing-line value.** If your `early_price` is usually bigger than
   the final BSP/SP for the horses you back, the model is finding real
   value.

## Being realistic

- Most betting models do not beat the market after commission. Expect a
  small edge at best (a few % ROI). Paper trade or use small stakes until
  live results match the backtest.
- Each check of a backtest, followed by a tweak, leaks a little future
  into your choices. Keep the last 6–12 months untouched as a final test.
- Bookmakers limit winning accounts quickly; exchanges (with commission)
  are the long-term route.
- Bet only what you can afford to lose. In Ireland, help is available from
  Gamblers Anonymous Ireland and the HSE problem gambling services.

## Ideas for improving it

- Sectional times, if you can source them, for pace and finishing speed.
- Price movements (early price vs morning price) as a feature.
- Sire/dam statistics for debutants and first-time all-weather runners.
- Each-way and place models (Harville / Henery formulas from the win
  probabilities).

## Layout

```
dundalk/
  course.py    Dundalk facts and distance bands
  data.py      CSV loading, validation, odds parsing, market probabilities
  features.py  point-in-time feature engineering
  model.py     conditional logit + Benter market blend (saved as JSON)
  staking.py   fractional Kelly with risk limits
  backtest.py  walk-forward backtest and report
  synth.py     synthetic data generator (testing only)
  atr_pdf.py   At The Races PDF form guide parser
  digest.py    race-by-race form digest
  cli.py       command line
tests/         leakage, gradient, staking and end-to-end tests
templates/     example CSV layouts
```
