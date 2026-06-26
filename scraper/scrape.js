/**
 * Curragh Sectional Data Scraper
 *
 * Scrapes RACEiQ Comparison + Sectional timing data from RacingTV.
 * The site uses div-based layout (not tables), so we extract by
 * text content and positional CSS classes.
 *
 * Usage:
 *   npm install && npm run install-browser && npm run scrape
 *
 * Env vars:
 *   HEADLESS=false  — watch the browser
 *   MAX_RACES=5     — limit race pages (each page has multiple races)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.racingtv.com';
const RESULTS_URL = `${BASE_URL}/racecourses/ie/curragh/results`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const HEADLESS = process.env.HEADLESS !== 'false';
const MAX_RACES = process.env.MAX_RACES ? parseInt(process.env.MAX_RACES) : Infinity;

const delay = ms => new Promise(r => setTimeout(r, ms));

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

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await delay(500);
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'results_page.png'), fullPage: true });

  const links = await page.evaluate((base) => {
    const results = [];
    for (const a of document.querySelectorAll('a')) {
      const text = a.textContent.trim();
      if (text.includes('Full Result')) {
        const href = a.getAttribute('href');
        if (href) {
          const fullHref = href.startsWith('http') ? href : base + href;
          const parent = a.closest('div, li, section, article') || a.parentElement;
          const ctx = parent ? parent.textContent.trim().replace(/\s+/g, ' ').substring(0, 200) : '';
          results.push({ href: fullHref, context: ctx });
        }
      }
    }
    return results;
  }, BASE_URL);

  const seen = new Set();
  return links.filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });
}

async function findRaceTimeTabs(page) {
  return page.evaluate((base) => {
    const tabs = [];
    for (const a of document.querySelectorAll('a')) {
      const text = a.textContent.trim();
      const href = a.getAttribute('href');
      if (/^\d{2}:\d{2}$/.test(text) && href) {
        tabs.push({ time: text, href: href.startsWith('http') ? href : base + href });
      }
    }
    return tabs;
  }, BASE_URL);
}

async function clickDivTab(page, tabName) {
  // RacingTV uses plain divs as tabs, not <a> or <button>
  // Try clicking any element whose text matches
  const strategies = [
    `div:has-text("${tabName}")`,
    `span:has-text("${tabName}")`,
    `text="${tabName}"`,
    `a:has-text("${tabName}")`,
    `button:has-text("${tabName}")`,
    `[role="tab"]:has-text("${tabName}")`,
  ];

  for (const sel of strategies) {
    try {
      // Use exact text matching where possible
      const els = page.locator(sel);
      const count = await els.count();
      for (let i = 0; i < count; i++) {
        const el = els.nth(i);
        const elText = await el.textContent();
        // Check for exact or near-exact match to avoid clicking parent containers
        if (elText && elText.trim() === tabName) {
          if (await el.isVisible({ timeout: 1000 })) {
            await el.click();
            await delay(2000);
            return true;
          }
        }
      }
    } catch {}
  }

  // Fallback: use JavaScript click on the most precise match
  const clicked = await page.evaluate((name) => {
    // Find all text nodes that match
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      const directText = Array.from(node.childNodes)
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim())
        .join('');
      if (directText === name || (text === name && node.children.length === 0)) {
        node.click();
        return true;
      }
    }
    return false;
  }, tabName);

  if (clicked) {
    await delay(2000);
    return true;
  }

  return false;
}

async function extractRaceHeader(page) {
  return page.evaluate(() => {
    const info = {};
    const text = document.body.innerText;

    // Get visible heading text
    for (const h of document.querySelectorAll('h1, h2, h3')) {
      const t = h.textContent.trim().replace(/\s+/g, ' ');
      if (t.includes('CURRAGH') || t.includes('Curragh')) {
        info.raceTitle = t;
        break;
      }
    }
    if (!info.raceTitle) {
      const h1 = document.querySelector('h1');
      if (h1) info.raceTitle = h1.textContent.trim().replace(/\s+/g, ' ');
    }

    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) info.date = dateMatch[1];

    const goingMatch = text.match(/(Good To (?:Firm|Yielding|Soft)|Good|Firm|Soft|Heavy|Yielding|Standard)/i);
    if (goingMatch) info.going = goingMatch[0];

    const runnersMatch = text.match(/\((\d+)\s*runners?\)/i);
    if (runnersMatch) info.runners = runnersMatch[1];

    // Try to get race name from breadcrumb or subtitle
    const distMatch = text.match(/(\d+[fmh]\s*\d*[yf]?)/i);
    if (distMatch) info.distance = distMatch[0];

    return info;
  });
}

async function extractVisibleTabData(page, tabLabel) {
  // The data is rendered in div-based rows, not HTML tables.
  // We capture the full visible text content of the active tab panel,
  // then also attempt structured extraction.
  return page.evaluate((label) => {
    const data = { headers: [], rows: [], meta: {}, rawText: '' };

    // --- Try table extraction first (in case some views use tables) ---
    for (const table of document.querySelectorAll('table')) {
      const ths = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
      const headers = Array.from(ths).map(th => th.textContent.trim().replace(/\s+/g, ' '));
      if (headers.length < 2) continue;
      data.headers = headers;
      for (const tr of table.querySelectorAll('tbody tr, tr:not(:first-child)')) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent.trim().replace(/\s+/g, ' '));
        if (cells.length > 0 && cells.some(c => c !== '')) data.rows.push(cells);
      }
      if (data.rows.length > 0) return data;
    }

    // --- Div-based extraction ---
    // RacingTV renders sectionals/raceIQ as nested divs.
    // Strategy: capture the full visible text of the currently active content area.
    // The tab content is typically the sibling/child of the tab container that's visible.

    const bodyText = document.body.innerText;

    // Extract meta info for sectionals
    const timeIdxMatch = bodyText.match(/Time Index[:\s]*([\d.\/]+)/i);
    if (timeIdxMatch) data.meta.timeIndex = timeIdxMatch[1];
    const meetAvgMatch = bodyText.match(/Meeting Avg[:\s]*([\d.]+)/i);
    if (meetAvgMatch) data.meta.meetingAvg = meetAvgMatch[1];
    const vsParMatch = bodyText.match(/Vs[.\s]*Par[:\s]*([+-]?[\d.]+s?)/i);
    if (vsParMatch) data.meta.vsPar = vsParMatch[1];

    // Find the content area that contains the data grid
    // Look for elements that contain "Pos." and "Horse Information" (column headers)
    const allDivs = document.querySelectorAll('div');
    let bestContainer = null;
    let bestScore = 0;

    for (const div of allDivs) {
      const t = div.innerText || '';
      if (t.length < 50 || t.length > 20000) continue;

      let score = 0;
      if (t.includes('Pos.')) score++;
      if (t.includes('Horse Information')) score++;
      if (t.includes('Total Time')) score++;
      if (/\d+f/.test(t)) score++;  // furlong markers
      if (t.includes('1st')) score++;
      if (t.includes('FSP')) score++;

      // Penalize if it's the whole page
      if (div === document.body || t.length > 10000) score -= 2;

      if (score > bestScore) {
        bestScore = score;
        bestContainer = div;
      }
    }

    if (bestContainer) {
      data.rawText = bestContainer.innerText.substring(0, 8000);

      // Try to parse rows from the raw text
      // Each horse entry typically looks like:
      // 1st  2 (3)  Horse Name  15.41  11.51  11.38  11.26  11.23  12.25  1m, 13.21s
      const lines = data.rawText.split('\n').map(l => l.trim()).filter(l => l);

      // Find header line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Pos.') && lines[i].includes('Horse Information')) {
          // This line (or nearby lines) form the header
          const headerLine = lines[i];
          // Extract headers - split by known patterns
          const hParts = headerLine.split(/\s{2,}/).map(h => h.trim()).filter(h => h);
          if (hParts.length >= 3) data.headers = hParts;
          break;
        }
      }
    }

    // If no structured container found, grab raw text
    if (!data.rawText) {
      const main = document.querySelector('main, [class*="content"]');
      data.rawText = (main || document.body).innerText.substring(0, 8000);
    }

    return data;
  }, tabLabel);
}

async function scrapeCurrentRace(page, raceIndex, timeLabel) {
  const raceData = {
    header: {},
    raceIQ: null,
    sectionals: null,
  };

  raceData.header = await extractRaceHeader(page);
  raceData.header.raceTime = timeLabel;
  console.log(`    Race: ${raceData.header.raceTitle || 'Unknown'} ${timeLabel}`);

  // 1) RACEiQ COMPARISON tab
  console.log('    > RACEiQ COMPARISON...');
  let clicked = await clickDivTab(page, 'RACEiQ COMPARISON');
  if (!clicked) clicked = await clickDivTab(page, 'RACEIQ COMPARISON');

  if (clicked) {
    await page.screenshot({ path: path.join(OUTPUT_DIR, `race_${raceIndex}_raceiq.png`), fullPage: true });
    raceData.raceIQ = await extractVisibleTabData(page, 'raceiq');
    console.log(`      Rows: ${raceData.raceIQ.rows?.length || 0}, Raw: ${raceData.raceIQ.rawText?.length || 0} chars`);
  } else {
    console.log('      [skip] Tab not found');
  }

  // 2) SECTIONALS tab
  console.log('    > SECTIONALS...');
  clicked = await clickDivTab(page, 'SECTIONALS');
  if (!clicked) clicked = await clickDivTab(page, 'Sectionals');

  if (clicked) {
    await page.screenshot({ path: path.join(OUTPUT_DIR, `race_${raceIndex}_sectionals.png`), fullPage: true });
    raceData.sectionals = await extractVisibleTabData(page, 'sectionals');
    console.log(`      Meta: ${JSON.stringify(raceData.sectionals.meta)}`);
    console.log(`      Rows: ${raceData.sectionals.rows?.length || 0}, Raw: ${raceData.sectionals.rawText?.length || 0} chars`);
  } else {
    console.log('      [skip] Tab not found');
  }

  return raceData;
}

async function scrapeRacePage(page, raceUrl, raceIndex) {
  console.log(`\n  [Race page ${raceIndex}] ${raceUrl}`);

  await page.goto(raceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await dismissCookies(page);

  const timeTabs = await findRaceTimeTabs(page);
  const races = [];

  if (timeTabs.length > 0) {
    console.log(`    Time tabs: ${timeTabs.map(t => t.time).join(', ')}`);
    for (let t = 0; t < timeTabs.length; t++) {
      const tab = timeTabs[t];
      console.log(`\n    --- ${tab.time} ---`);
      await page.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2500);
      await dismissCookies(page);

      const raceData = await scrapeCurrentRace(page, `${raceIndex}_${t + 1}`, tab.time);
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

function writeOutputs(allRaces) {
  // Full JSON
  const jsonPath = path.join(OUTPUT_DIR, 'curragh_all_data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allRaces, null, 2));
  console.log(`  JSON: ${jsonPath}`);

  // Raw text dump — most reliable output given div-based layout
  let rawDump = '';
  for (const r of allRaces) {
    rawDump += `\n${'='.repeat(80)}\n`;
    rawDump += `DATE: ${r.header?.date || ''}\n`;
    rawDump += `TIME: ${r.header?.raceTime || ''}\n`;
    rawDump += `RACE: ${r.header?.raceTitle || ''}\n`;
    rawDump += `GOING: ${r.header?.going || ''}\n`;
    rawDump += `DISTANCE: ${r.header?.distance || ''}\n`;
    rawDump += `RUNNERS: ${r.header?.runners || ''}\n`;
    rawDump += `URL: ${r.raceUrl || ''}\n`;

    if (r.raceIQ?.rawText) {
      rawDump += `\n--- RACEiQ COMPARISON ---\n${r.raceIQ.rawText}\n`;
    }
    if (r.sectionals) {
      rawDump += `\n--- SECTIONALS ---\n`;
      if (r.sectionals.meta) rawDump += `Time Index: ${r.sectionals.meta.timeIndex || 'N/A'} | Meeting Avg: ${r.sectionals.meta.meetingAvg || 'N/A'} | Vs Par: ${r.sectionals.meta.vsPar || 'N/A'}\n`;
      if (r.sectionals.rawText) rawDump += `${r.sectionals.rawText}\n`;
    }
  }
  const rawPath = path.join(OUTPUT_DIR, 'curragh_all_raw.txt');
  fs.writeFileSync(rawPath, rawDump);
  console.log(`  Raw text: ${rawPath}`);

  // Try CSV from any structured rows
  const csvRows = [];
  for (const race of allRaces) {
    const sec = race.sectionals;
    if (!sec?.rows?.length) continue;
    const prefix = [race.header?.date, race.header?.raceTime, race.header?.raceTitle, race.header?.distance, race.header?.going, race.header?.runners, sec.meta?.timeIndex, sec.meta?.meetingAvg, sec.meta?.vsPar];
    for (const row of sec.rows) {
      csvRows.push([...prefix, ...row]);
    }
  }
  if (csvRows.length > 0) {
    const maxCols = Math.max(...csvRows.map(r => r.length));
    const sampleHeaders = allRaces.find(r => r.sectionals?.headers?.length)?.sectionals?.headers || [];
    const header = ['Date', 'Time', 'Race', 'Distance', 'Going', 'Runners', 'TimeIdx', 'MeetAvg', 'VsPar', ...sampleHeaders];
    while (header.length < maxCols) header.push(`Col${header.length}`);
    const lines = [header.map(h => `"${h}"`).join(',')];
    for (const row of csvRows) {
      while (row.length < maxCols) row.push('');
      lines.push(row.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','));
    }
    const csvPath = path.join(OUTPUT_DIR, 'curragh_sectionals.csv');
    fs.writeFileSync(csvPath, lines.join('\n'));
    console.log(`  Sectionals CSV: ${csvPath}`);
  }
}

async function main() {
  console.log('=== Curragh Sectional & RaceIQ Scraper ===');
  console.log(`Headless: ${HEADLESS} | Max race pages: ${MAX_RACES === Infinity ? 'unlimited' : MAX_RACES}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await (await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })).newPage();
  page.setDefaultTimeout(15000);

  try {
    console.log('--- Step 1: Finding Full Result links ---');
    const fullResultLinks = await collectFullResultLinks(page);
    console.log(`  Found ${fullResultLinks.length} "Full Result" links`);

    if (fullResultLinks.length === 0) {
      console.log('\n  [!] No links found. Check output/results_page.png');
      const allLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent.trim().replace(/\s+/g, ' ').substring(0, 100)
        }))
      );
      fs.writeFileSync(path.join(OUTPUT_DIR, 'debug_links.json'), JSON.stringify(allLinks, null, 2));
      await browser.close();
      return;
    }

    const toScrape = fullResultLinks.slice(0, MAX_RACES);
    console.log(`  Scraping ${toScrape.length} race pages\n`);

    console.log('--- Step 2: Scraping races ---');
    const allRaces = [];

    for (let i = 0; i < toScrape.length; i++) {
      try {
        const races = await scrapeRacePage(page, toScrape[i].href, i + 1);
        allRaces.push(...races);
      } catch (err) {
        console.log(`  [error] Page ${i + 1}: ${err.message}`);
        await page.screenshot({ path: path.join(OUTPUT_DIR, `error_${i + 1}.png`), fullPage: true }).catch(() => {});
      }
      await delay(1500);
    }

    console.log('\n--- Step 3: Saving ---');
    writeOutputs(allRaces);

    const withSec = allRaces.filter(r => r.sectionals?.rawText || r.sectionals?.rows?.length).length;
    const withIQ = allRaces.filter(r => r.raceIQ?.rawText || r.raceIQ?.rows?.length).length;
    console.log(`\n=== DONE ===`);
    console.log(`  Races: ${allRaces.length} | With sectionals: ${withSec} | With RaceIQ: ${withIQ}`);
    console.log(`  Output: ${OUTPUT_DIR}`);

  } catch (err) {
    console.error('Fatal:', err);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'fatal.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
