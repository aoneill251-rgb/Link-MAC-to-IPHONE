# Curragh Sectional Data Scraper

Automated scraper that pulls sectional timing data from RacingTV for all Curragh races, building a structured database ahead of Derby Weekend.

## Setup

```bash
cd scraper
npm install
npm run install-browser
```

## Run

```bash
npm run scrape
```

### Options (environment variables)

| Variable    | Default | Description                          |
|-------------|---------|--------------------------------------|
| `HEADLESS`  | `true`  | Set `false` to watch the browser     |
| `MAX_RACES` | all     | Limit number of races (for testing)  |

```bash
# Watch the browser scrape (useful for debugging)
HEADLESS=false npm run scrape

# Scrape only 3 races to test
MAX_RACES=3 npm run scrape
```

## Output

Results are saved to `scraper/output/`:

| File | Description |
|------|-------------|
| `curragh_sectionals.json` | Full structured data (race metadata + sectional rows) |
| `curragh_sectionals.csv`  | Flat CSV for spreadsheet / database import |
| `step1_results_page.png`  | Screenshot of the results listing page |
| `race_N_fullresult.png`   | Screenshot of each race's full result |
| `race_N_sectionals.png`   | Screenshot of each race's sectionals tab |

## Flow

1. Navigate to `racingtv.com/racecourses/ie/curragh/results`
2. Find all race meeting date links
3. For each meeting, find individual race links
4. For each race: open page → click "Full Result" → click "Sectionals" → extract table data
5. Save combined JSON + CSV

## Troubleshooting

If selectors break (RacingTV may update their page structure):

1. Run with `HEADLESS=false` to see what the browser sees
2. Check `output/step1_page_text.txt` for page content
3. Check `output/all_links_debug.json` for all links found
4. Update selectors in `scrape.js` accordingly
