/**
 * Curragh Sectional Data Scraper
 *
 * Scrapes RACEiQ Comparison + Sectional timing data from RacingTV
 * for all Curragh races.
 *
 * Usage:
 *   npm install
 *   npm run install-browser
 *   npm run scrape
 *
 * Options (env vars):
 *   HEADLESS=false  — run with visible browser for debugging
 *   MAX_RACES=5     — limit number of races to scrape (for testing)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.racingtv.com';
const RESULTS_URL = `${BASE_URL}/racecourses/ie/curragh/results`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const HEADLESS = process.env.HEADLESS !== 'false';
const MAX_RACES = process.env.MAX_RACES ? parseInt(process.env.MAX_RACES) : Infinity;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dismissCookies(page) {
  try {
    const btn = page.locator('button:has-text("Accept"), button:has-text("OK"), button:has-text("Agree"), [class*="cookie"] button, [class*="consent"] button').first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      await delay(500);
    }
  } catch {}
}

async function collectFullResultLinks(page) {
  console.log('  Loading Curragh results page...');
  await page.goto(RESULTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await dismissCookies(page);

  // Scroll to load all content
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await delay(500);
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'results_page.png'), fullPage: true });

  // Find all "Full Result" links
  const links = await page.evaluate((base) => {
    const results = [];
    const anchors = document.querySelectorAll('a');
    for (const a of anchors) {
      const text = a.textContent.trim();
      if (text.includes('Full Result')) {
        const href = a.getAttribute('href');
        if (href) {
          const fullHref = href.startsWith('http') ? href : base + href;
          // Get the race summary text from the parent/sibling elements
          const parent = a.closest('div, li, section, article') || a.parentElement;
          const contextText = parent ? parent.textContent.trim().replace(/\s+/g, ' ').substring(0, 200) : '';
          results.push({ href: fullHref, context: contextText });
        }
      }
    }
    return results;
  }, BASE_URL);

  // Deduplicate
  const seen = new Set();
  const unique = links.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  console.log(`  Found ${unique.length} "Full Result" links`);
  return unique;
}

async function extractRaceHeader(page) {
  return page.evaluate(() => {
    const info = {};

    // Race time + course (e.g. "16:40 CURRAGH")
    const headings = document.querySelectorAll('h1, h2, h3, [class*="race-header"], [class*="raceHeader"]');
    for (const h of headings) {
      const text = h.textContent.trim();
      if (text.includes('CURRAGH') || text.includes('Curragh')) {
        info.raceTitle = text.replace(/\s+/g, ' ');
        break;
      }
    }
    if (!info.raceTitle) {
      const h1 = document.querySelector('h1');
      if (h1) info.raceTitle = h1.textContent.trim().replace(/\s+/g, ' ');
    }

    // Race name (e.g. "Sky Bet Extra Places Handicap")
    // Look for italicized or linked race name
    const raceNameEl = document.querySelector('h2, h3, [class*="raceName"], [class*="race-name"]');
    if (raceNameEl) info.raceName = raceNameEl.textContent.trim().replace(/\s+/g, ' ');

    // Race details (e.g. "Good To Yielding 3YO only 6f 63y Winner: €10,800 (18 runners)")
    const bodyText = document.body.innerText;

    // Date
    const dateMatch = bodyText.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) info.date = dateMatch[1];

    // Distance
    const distMatch = bodyText.match(/(\d+[fmh]\s*\d*[yf]?|\d+\s*furlongs?|\d+\s*miles?)/i);
    if (distMatch) info.distance = distMatch[0];

    // Going
    const goingMatch = bodyText.match(/(Good To (?:Firm|Yielding|Soft)|Good|Firm|Soft|Heavy|Yielding|Standard)/i);
    if (goingMatch) info.going = goingMatch[0];

    // Number of runners
    const runnersMatch = bodyText.match(/\((\d+)\s*runners?\)/i);
    if (runnersMatch) info.runners = runnersMatch[1];

    return info;
  });
}

async function clickTab(page, tabName) {
  // Try multiple strategies to click the tab
  const strategies = [
    () => page.locator(`text="${tabName}"`).first(),
    () => page.locator(`a:has-text("${tabName}")`).first(),
    () => page.locator(`button:has-text("${tabName}")`).first(),
    () => page.locator(`[role="tab"]:has-text("${tabName}")`).first(),
    () => page.locator(`text="${tabName.toUpperCase()}"`).first(),
  ];

  for (const getLocator of strategies) {
    try {
      const el = getLocator();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await delay(2000);
        return true;
      }
    } catch {}
  }
  return false;
}

async function extractResultData(page) {
  return page.evaluate(() => {
    const data = { headers: [], rows: [] };

    // Find any table on the page
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const ths = table.querySelectorAll('thead th, thead td, tr:first-child th');
      const headers = Array.from(ths).map(th => th.textContent.trim());
      if (headers.length < 2) continue;

      data.headers = headers;
      const trs = table.querySelectorAll('tbody tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim().replace(/\s+/g, ' '));
        if (cells.length > 0 && cells.some(c => c !== '')) {
          data.rows.push(cells);
        }
      }
      if (data.rows.length > 0) break;
    }

    // If no table found, try div-based layout
    if (data.rows.length === 0) {
      const container = document.querySelector('[class*="result"], [class*="Result"], main, .content');
      if (container) {
        data.rawText = container.innerText.substring(0, 5000);
      }
    }

    return data;
  });
}

async function extractRaceIQData(page) {
  return page.evaluate(() => {
    const data = { headers: [], rows: [] };

    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const ths = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
      const headers = Array.from(ths).map(th => th.textContent.trim().replace(/\s+/g, ' '));
      if (headers.length < 2) continue;

      data.headers = headers;
      const trs = table.querySelectorAll('tbody tr, tr:not(:first-child)');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent.trim().replace(/\s+/g, ' '));
        if (cells.length > 0 && cells.some(c => c !== '')) {
          data.rows.push(cells);
        }
      }
      if (data.rows.length > 0) break;
    }

    // Fallback: structured div extraction
    if (data.rows.length === 0) {
      const container = document.querySelector('main, .content, [class*="comparison"], [class*="Comparison"]');
      if (container) {
        data.rawText = container.innerText.substring(0, 5000);
      }
    }

    return data;
  });
}

async function extractSectionalData(page) {
  return page.evaluate(() => {
    const data = { headers: [], rows: [], meta: {} };

    // Extract the meta info (Time Index, Meeting Avg, Vs.Par)
    const bodyText = document.body.innerText;
    const timeIdxMatch = bodyText.match(/Time Index[:\s]*([\d.\/]+)/i);
    if (timeIdxMatch) data.meta.timeIndex = timeIdxMatch[1];

    const meetAvgMatch = bodyText.match(/Meeting Avg[:\s]*([\d.]+)/i);
    if (meetAvgMatch) data.meta.meetingAvg = meetAvgMatch[1];

    const vsParMatch = bodyText.match(/Vs[.\s]*Par[:\s]*([+-]?[\d.]+s?)/i);
    if (vsParMatch) data.meta.vsPar = vsParMatch[1];

    // Find the sectionals table
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const ths = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
      const headers = Array.from(ths).map(th => th.textContent.trim().replace(/\s+/g, ' '));

      // Check if this looks like a sectionals table (has furlong columns like 1f, 2f, etc.)
      const headerText = headers.join(' ');
      const hasFurlongs = /\d+f/.test(headerText) || headerText.includes('Total Time');

      if (headers.length >= 3) {
        data.headers = headers;
        const trs = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        for (const tr of trs) {
          const cells = Array.from(tr.querySelectorAll('td, th')).map(td => {
            return td.textContent.trim().replace(/\s+/g, ' ');
          });
          if (cells.length > 0 && cells.some(c => c !== '')) {
            data.rows.push(cells);
          }
        }
        if (data.rows.length > 0 && hasFurlongs) break;
      }
    }

    // Fallback: div-based rows (RacingTV might use divs instead of tables)
    if (data.rows.length === 0) {
      // Look for sectional-specific containers
      const containers = document.querySelectorAll(
        '[class*="sectional"], [class*="Sectional"], [class*="timing"], [class*="split"], [class*="furlong"]'
      );
      for (const container of containers) {
        if (container.innerText.length > 30) {
          data.rawText = container.innerText.substring(0, 5000);
          break;
        }
      }
      // Ultimate fallback
      if (!data.rawText) {
        const main = document.querySelector('main, .content');
        if (main) data.rawText = main.innerText.substring(0, 5000);
      }
    }

    return data;
  });
}

async function findRaceTimeTabs(page) {
  // On a race page, there are time tabs at the top (16:40, 17:10, 17:40, etc.)
  return page.evaluate((base) => {
    const tabs = [];
    const anchors = document.querySelectorAll('a');
    for (const a of anchors) {
      const text = a.textContent.trim();
      const href = a.getAttribute('href');
      // Match time patterns like "16:40", "17:10"
      if (/^\d{2}:\d{2}$/.test(text) && href) {
        const fullHref = href.startsWith('http') ? href : base + href;
        tabs.push({ time: text, href: fullHref });
      }
    }
    return tabs;
  }, BASE_URL);
}

async function scrapeRacePage(page, raceUrl, raceIndex) {
  console.log(`\n  [Race ${raceIndex}] Loading: ${raceUrl}`);

  await page.goto(raceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await dismissCookies(page);

  // Check if this page has multiple race time tabs
  const timeTabs = await findRaceTimeTabs(page);
  const races = [];

  if (timeTabs.length > 1) {
    console.log(`    Found ${timeTabs.length} race time tabs: ${timeTabs.map(t => t.time).join(', ')}`);

    for (let t = 0; t < timeTabs.length; t++) {
      const tab = timeTabs[t];
      console.log(`\n    --- ${tab.time} ---`);

      await page.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2000);
      await dismissCookies(page);

      const raceData = await scrapeCurrentRace(page, `${raceIndex}_${t + 1}`, tab.time);
      raceData.raceTime = tab.time;
      raceData.raceUrl = tab.href;
      races.push(raceData);

      await delay(1000);
    }
  } else {
    const raceData = await scrapeCurrentRace(page, raceIndex, '');
    raceData.raceUrl = raceUrl;
    races.push(raceData);
  }

  return races;
}

async function scrapeCurrentRace(page, raceIndex, timeLabel) {
  const raceData = {
    header: {},
    result: null,
    raceIQ: null,
    sectionals: null,
  };

  // Extract header info
  raceData.header = await extractRaceHeader(page);
  console.log(`    Race: ${raceData.header.raceTitle || 'Unknown'}`);
  if (raceData.header.raceName) console.log(`    Name: ${raceData.header.raceName}`);

  // 1) RESULT tab (usually selected by default)
  console.log('    > Extracting RESULT...');
  const resultClicked = await clickTab(page, 'RESULT');
  if (!resultClicked) await clickTab(page, 'Result');
  await delay(1000);
  raceData.result = await extractResultData(page);
  console.log(`      Found ${raceData.result.rows?.length || 0} result rows`);

  // 2) RACEiQ COMPARISON tab
  console.log('    > Extracting RACEiQ COMPARISON...');
  let raceIQClicked = await clickTab(page, 'RACEiQ COMPARISON');
  if (!raceIQClicked) raceIQClicked = await clickTab(page, 'RACEIQ COMPARISON');
  if (!raceIQClicked) raceIQClicked = await clickTab(page, 'RaceIQ');
  if (!raceIQClicked) raceIQClicked = await clickTab(page, 'Comparison');

  if (raceIQClicked) {
    await delay(1500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `race_${raceIndex}_raceiq.png`),
      fullPage: true
    });
    raceData.raceIQ = await extractRaceIQData(page);
    console.log(`      Found ${raceData.raceIQ.rows?.length || 0} RaceIQ rows`);
    if (raceData.raceIQ.rawText) console.log(`      (raw text captured: ${raceData.raceIQ.rawText.length} chars)`);
  } else {
    console.log('      [skip] RACEiQ COMPARISON tab not found');
  }

  // 3) SECTIONALS tab
  console.log('    > Extracting SECTIONALS...');
  let secClicked = await clickTab(page, 'SECTIONALS');
  if (!secClicked) secClicked = await clickTab(page, 'Sectionals');
  if (!secClicked) secClicked = await clickTab(page, 'Sectional');

  if (secClicked) {
    await delay(1500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `race_${raceIndex}_sectionals.png`),
      fullPage: true
    });
    raceData.sectionals = await extractSectionalData(page);
    console.log(`      Meta: ${JSON.stringify(raceData.sectionals.meta)}`);
    console.log(`      Headers: ${raceData.sectionals.headers?.join(', ') || 'none'}`);
    console.log(`      Found ${raceData.sectionals.rows?.length || 0} sectional rows`);
    if (raceData.sectionals.rawText) console.log(`      (raw text captured: ${raceData.sectionals.rawText.length} chars)`);
  } else {
    console.log('      [skip] SECTIONALS tab not found');
  }

  return raceData;
}

function buildSectionalsCSV(allRaces) {
  const lines = [];
  const csvRows = [];

  for (const race of allRaces) {
    if (!race.sectionals?.rows?.length && !race.sectionals?.rawText) continue;

    const label = race.header?.raceTitle || '';
    const name = race.header?.raceName || '';
    const date = race.header?.date || '';
    const dist = race.header?.distance || '';
    const going = race.header?.going || '';
    const runners = race.header?.runners || '';
    const timeIdx = race.sectionals?.meta?.timeIndex || '';
    const meetAvg = race.sectionals?.meta?.meetingAvg || '';
    const vsPar = race.sectionals?.meta?.vsPar || '';

    if (race.sectionals.rows?.length) {
      for (const row of race.sectionals.rows) {
        csvRows.push([date, label, name, dist, going, runners, timeIdx, meetAvg, vsPar, ...row]);
      }
    }
  }

  if (csvRows.length === 0) return '';

  // Header
  const maxCols = Math.max(...csvRows.map(r => r.length));
  const sampleRace = allRaces.find(r => r.sectionals?.headers?.length);
  const secHeaders = sampleRace?.sectionals?.headers || [];
  const headerRow = ['Date', 'Race Title', 'Race Name', 'Distance', 'Going', 'Runners', 'Time Index', 'Meeting Avg', 'Vs Par', ...secHeaders];
  while (headerRow.length < maxCols) headerRow.push(`Col${headerRow.length}`);

  lines.push(headerRow.map(h => `"${h}"`).join(','));

  for (const row of csvRows) {
    while (row.length < maxCols) row.push('');
    lines.push(row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
  }

  return lines.join('\n');
}

function buildRaceIQCSV(allRaces) {
  const lines = [];
  const csvRows = [];

  for (const race of allRaces) {
    if (!race.raceIQ?.rows?.length && !race.raceIQ?.rawText) continue;

    const label = race.header?.raceTitle || '';
    const name = race.header?.raceName || '';
    const date = race.header?.date || '';
    const dist = race.header?.distance || '';
    const going = race.header?.going || '';

    if (race.raceIQ.rows?.length) {
      for (const row of race.raceIQ.rows) {
        csvRows.push([date, label, name, dist, going, ...row]);
      }
    }
  }

  if (csvRows.length === 0) return '';

  const maxCols = Math.max(...csvRows.map(r => r.length));
  const sampleRace = allRaces.find(r => r.raceIQ?.headers?.length);
  const iqHeaders = sampleRace?.raceIQ?.headers || [];
  const headerRow = ['Date', 'Race Title', 'Race Name', 'Distance', 'Going', ...iqHeaders];
  while (headerRow.length < maxCols) headerRow.push(`Col${headerRow.length}`);

  lines.push(headerRow.map(h => `"${h}"`).join(','));

  for (const row of csvRows) {
    while (row.length < maxCols) row.push('');
    lines.push(row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
  }

  return lines.join('\n');
}

async function main() {
  console.log('=== Curragh Sectional & RaceIQ Scraper ===');
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Max races: ${MAX_RACES === Infinity ? 'unlimited' : MAX_RACES}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Step 1: Find all "Full Result" links on the Curragh results page
    console.log('--- Step 1: Finding Full Result links ---');
    const fullResultLinks = await collectFullResultLinks(page);

    if (fullResultLinks.length === 0) {
      console.log('\n  [!] No "Full Result" links found.');
      console.log('  Check output/results_page.png to see what the page looks like.');

      // Dump all links for debugging
      const allLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent.trim().replace(/\s+/g, ' ').substring(0, 100)
        }))
      );
      fs.writeFileSync(path.join(OUTPUT_DIR, 'debug_all_links.json'), JSON.stringify(allLinks, null, 2));
      console.log(`  Dumped ${allLinks.length} links to output/debug_all_links.json`);

      // Also dump full page text
      const pageText = await page.evaluate(() => document.body.innerText);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'debug_page_text.txt'), pageText);

      await browser.close();
      return;
    }

    // Limit
    const linksToScrape = fullResultLinks.slice(0, MAX_RACES);
    console.log(`\n  Will scrape ${linksToScrape.length} race pages`);

    // Step 2: Scrape each race
    console.log('\n--- Step 2: Scraping each race ---');
    const allRaces = [];

    for (let i = 0; i < linksToScrape.length; i++) {
      const link = linksToScrape[i];
      try {
        const races = await scrapeRacePage(page, link.href, i + 1);
        allRaces.push(...races);
      } catch (err) {
        console.log(`  [error] Race ${i + 1}: ${err.message}`);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `error_race_${i + 1}.png`),
          fullPage: true
        });
      }
      await delay(1500);
    }

    // Step 3: Save everything
    console.log('\n--- Step 3: Saving data ---');

    // Full JSON
    const jsonPath = path.join(OUTPUT_DIR, 'curragh_all_data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allRaces, null, 2));
    console.log(`  JSON (all data): ${jsonPath}`);

    // Sectionals CSV
    const secCSV = buildSectionalsCSV(allRaces);
    if (secCSV) {
      const secPath = path.join(OUTPUT_DIR, 'curragh_sectionals.csv');
      fs.writeFileSync(secPath, secCSV);
      console.log(`  Sectionals CSV: ${secPath}`);
    } else {
      console.log('  [!] No sectional data found for CSV');
    }

    // RaceIQ CSV
    const iqCSV = buildRaceIQCSV(allRaces);
    if (iqCSV) {
      const iqPath = path.join(OUTPUT_DIR, 'curragh_raceiq.csv');
      fs.writeFileSync(iqPath, iqCSV);
      console.log(`  RaceIQ CSV: ${iqPath}`);
    } else {
      console.log('  [!] No RaceIQ data found for CSV');
    }

    // Raw text fallback file (for any races where tables weren't parsed)
    const rawRaces = allRaces.filter(r =>
      (r.sectionals?.rawText && !r.sectionals?.rows?.length) ||
      (r.raceIQ?.rawText && !r.raceIQ?.rows?.length)
    );
    if (rawRaces.length > 0) {
      let rawOutput = '';
      for (const r of rawRaces) {
        rawOutput += `\n${'='.repeat(80)}\n`;
        rawOutput += `RACE: ${r.header?.raceTitle || 'Unknown'}\n`;
        rawOutput += `NAME: ${r.header?.raceName || ''}\n`;
        rawOutput += `URL: ${r.raceUrl || ''}\n`;
        if (r.raceIQ?.rawText) {
          rawOutput += `\n--- RACEiQ COMPARISON ---\n${r.raceIQ.rawText}\n`;
        }
        if (r.sectionals?.rawText) {
          rawOutput += `\n--- SECTIONALS ---\n${r.sectionals.rawText}\n`;
        }
      }
      const rawPath = path.join(OUTPUT_DIR, 'curragh_raw_text.txt');
      fs.writeFileSync(rawPath, rawOutput);
      console.log(`  Raw text fallback: ${rawPath}`);
    }

    // Summary
    const withSec = allRaces.filter(r => r.sectionals?.rows?.length > 0).length;
    const withIQ = allRaces.filter(r => r.raceIQ?.rows?.length > 0).length;
    const withSecText = allRaces.filter(r => r.sectionals?.rawText).length;
    const withIQText = allRaces.filter(r => r.raceIQ?.rawText).length;

    console.log(`\n=== SUMMARY ===`);
    console.log(`  Total races scraped: ${allRaces.length}`);
    console.log(`  Sectional data (table): ${withSec}`);
    console.log(`  Sectional data (raw text): ${withSecText}`);
    console.log(`  RaceIQ data (table): ${withIQ}`);
    console.log(`  RaceIQ data (raw text): ${withIQText}`);
    console.log(`  Output: ${OUTPUT_DIR}`);

  } catch (err) {
    console.error('Fatal error:', err);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'fatal_error.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
