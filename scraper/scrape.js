/**
 * Curragh Sectional Data Scraper
 *
 * Scrapes sectional timing data from RacingTV for all Curragh races.
 * Outputs JSON + CSV to the ./output/ directory.
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

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function launchBrowser() {
  return chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

async function acceptCookies(page) {
  try {
    const cookieBtn = page.locator('button:has-text("Accept"), button:has-text("accept"), button:has-text("OK"), button:has-text("Agree"), [id*="cookie"] button, [class*="cookie"] button, [class*="consent"] button');
    const first = cookieBtn.first();
    if (await first.isVisible({ timeout: 3000 })) {
      await first.click();
      await delay(1000);
      console.log('  [cookies] Dismissed cookie banner');
    }
  } catch {
    // No cookie banner
  }
}

async function getRaceMeetingLinks(page) {
  await page.goto(RESULTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await acceptCookies(page);

  // Scroll down to trigger lazy-loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await delay(2000);

  // Take a screenshot for debugging
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'step1_results_page.png'), fullPage: true });

  // Grab all visible text to understand page structure
  const pageText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'step1_page_text.txt'), pageText);

  // Look for race meeting date links / cards that lead to individual race days
  const links = await page.evaluate((base) => {
    const results = [];
    const anchors = document.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.getAttribute('href');
      const text = a.textContent.trim().replace(/\s+/g, ' ');
      if (!href) continue;
      const fullHref = href.startsWith('http') ? href : base + href;

      // Match patterns like /results/2025-06-28/curragh or /racecourses/ie/curragh/results/...
      if (
        (href.includes('curragh') && href.includes('result')) ||
        (href.includes('/results/') && href.includes('curragh')) ||
        (href.match(/\/results\/\d{4}-\d{2}-\d{2}/) && href.toLowerCase().includes('curragh'))
      ) {
        results.push({ href: fullHref, text: text.substring(0, 120) });
      }
    }
    return results;
  }, BASE_URL);

  // Also look for links that just contain date patterns on the results page
  const dateLinks = await page.evaluate((base) => {
    const results = [];
    const anchors = document.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.getAttribute('href');
      const text = a.textContent.trim().replace(/\s+/g, ' ');
      if (!href) continue;
      const fullHref = href.startsWith('http') ? href : base + href;
      if (href.match(/\/\d{4}-\d{2}-\d{2}/)) {
        results.push({ href: fullHref, text: text.substring(0, 120) });
      }
    }
    return results;
  }, BASE_URL);

  // Combine and deduplicate
  const allLinks = [...links, ...dateLinks];
  const seen = new Set();
  const unique = allLinks.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  console.log(`\n  Found ${unique.length} meeting/date links`);
  unique.forEach(l => console.log(`    ${l.text} -> ${l.href}`));

  return unique;
}

async function getRaceLinksFromMeeting(page, meetingUrl) {
  await page.goto(meetingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await acceptCookies(page);

  const links = await page.evaluate((base) => {
    const results = [];
    const anchors = document.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.getAttribute('href');
      const text = a.textContent.trim().replace(/\s+/g, ' ');
      if (!href) continue;
      const fullHref = href.startsWith('http') ? href : base + href;
      // Individual race result links
      if (
        href.includes('/full-result') ||
        href.includes('/result/') ||
        (href.match(/\/race\/\d+/) && !href.includes('#'))
      ) {
        results.push({ href: fullHref, text: text.substring(0, 120) });
      }
    }
    return results;
  }, BASE_URL);

  const seen = new Set();
  return links.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

async function getIndividualRaceLinks(page) {
  // Sometimes the results page directly lists individual races rather than meetings
  await page.goto(RESULTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await acceptCookies(page);

  const links = await page.evaluate((base) => {
    const results = [];
    const anchors = document.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.getAttribute('href');
      const text = a.textContent.trim().replace(/\s+/g, ' ');
      if (!href) continue;
      const fullHref = href.startsWith('http') ? href : base + href;
      if (href.includes('full-result') || href.includes('/result/')) {
        results.push({ href: fullHref, text: text.substring(0, 120) });
      }
    }
    return results;
  }, BASE_URL);

  return links;
}

async function clickFullResult(page) {
  // Look for "Full Result" button/link/tab on the race page
  const selectors = [
    'a:has-text("Full Result")',
    'button:has-text("Full Result")',
    'a:has-text("full result")',
    '[data-tab="full-result"]',
    '.tab:has-text("Full Result")',
    'a:has-text("Result")',
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await delay(2000);
        console.log('    [nav] Clicked Full Result');
        return true;
      }
    } catch {}
  }
  console.log('    [nav] No Full Result button found (may already be on result page)');
  return false;
}

async function clickSectionals(page) {
  // Look for "Sectionals" button/tab
  const selectors = [
    'a:has-text("Sectionals")',
    'button:has-text("Sectionals")',
    'a:has-text("sectionals")',
    '[data-tab="sectionals"]',
    '.tab:has-text("Sectionals")',
    'a:has-text("Sectional")',
    'button:has-text("Sectional")',
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await delay(2000);
        console.log('    [nav] Clicked Sectionals tab');
        return true;
      }
    } catch {}
  }
  console.log('    [warn] No Sectionals tab found for this race');
  return false;
}

async function extractRaceMetadata(page) {
  return page.evaluate(() => {
    const getText = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };

    // Try various common selectors for race info
    const title = document.title;
    const h1 = getText('h1');
    const h2 = getText('h2');

    // Look for race details in structured elements
    const raceInfo = {};
    raceInfo.pageTitle = title;
    raceInfo.heading = h1 || h2;

    // Try to find race name, time, distance, class, etc.
    const detailSelectors = [
      '.race-header', '.race-title', '.race-name', '.race-info',
      '.racecard-header', '[class*="race-detail"]', '[class*="raceInfo"]',
      '.event-header', '.event-title'
    ];
    for (const sel of detailSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        raceInfo.details = el.textContent.trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Try to extract structured fields
    const allText = document.body.innerText;
    const distanceMatch = allText.match(/(\d+[mf]\s*\d*[yf]?|\d+\s*(miles?|furlongs?))/i);
    if (distanceMatch) raceInfo.distance = distanceMatch[0];

    const timeMatch = allText.match(/(\d{1,2}[:.]\d{2})\s*(am|pm)?/i);
    if (timeMatch) raceInfo.time = timeMatch[0];

    return raceInfo;
  });
}

async function extractSectionalData(page) {
  return page.evaluate(() => {
    const data = { headers: [], rows: [] };

    // Strategy 1: Find tables on the page
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
      const headers = Array.from(headerCells).map(c => c.textContent.trim());

      // Check if this looks like a sectional table
      const headerText = headers.join(' ').toLowerCase();
      const isSectional = headerText.includes('sectional') ||
                          headerText.includes('time') ||
                          headerText.includes('speed') ||
                          headerText.includes('position') ||
                          headerText.includes('furlong') ||
                          headerText.includes('finish') ||
                          headers.length >= 3;

      if (headers.length >= 2) {
        data.headers = headers;
        const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        for (const row of bodyRows) {
          const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
          if (cells.length > 0 && cells.some(c => c !== '')) {
            data.rows.push(cells);
          }
        }
        if (data.rows.length > 0) break;
      }
    }

    // Strategy 2: If no table found, look for structured div-based layouts
    if (data.rows.length === 0) {
      const containers = document.querySelectorAll('[class*="sectional"], [class*="Sectional"], [class*="timing"], [class*="split"]');
      for (const container of containers) {
        const text = container.innerText;
        if (text.length > 20) {
          data.rawText = text.substring(0, 3000);
          break;
        }
      }
    }

    // Strategy 3: Grab all visible text in the main content area as fallback
    if (data.rows.length === 0 && !data.rawText) {
      const mainContent = document.querySelector('main, .main, .content, .race-result, [class*="result"]');
      if (mainContent) {
        data.rawText = mainContent.innerText.substring(0, 5000);
      }
    }

    return data;
  });
}

async function scrapeRace(page, raceUrl, raceIndex) {
  console.log(`\n  [${raceIndex}] Scraping: ${raceUrl}`);

  try {
    await page.goto(raceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);
    await acceptCookies(page);

    // Extract race metadata
    const metadata = await extractRaceMetadata(page);
    console.log(`    Race: ${metadata.heading || metadata.pageTitle}`);

    // Click "Full Result" if available
    await clickFullResult(page);

    // Take screenshot of full result
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `race_${raceIndex}_fullresult.png`),
      fullPage: true
    });

    // Click "Sectionals" tab
    const hasSectionals = await clickSectionals(page);

    if (!hasSectionals) {
      return { raceUrl, metadata, sectionals: null, hasSectionals: false };
    }

    // Wait for sectional data to load
    await delay(2000);

    // Take screenshot of sectionals
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `race_${raceIndex}_sectionals.png`),
      fullPage: true
    });

    // Extract sectional data
    const sectionals = await extractSectionalData(page);
    console.log(`    Sectional headers: ${sectionals.headers?.join(', ') || 'none'}`);
    console.log(`    Rows found: ${sectionals.rows?.length || 0}`);

    return { raceUrl, metadata, sectionals, hasSectionals: true };

  } catch (err) {
    console.log(`    [error] ${err.message}`);
    return { raceUrl, metadata: {}, sectionals: null, error: err.message };
  }
}

function buildCSV(allRaces) {
  const lines = [];

  // Determine all unique headers across races
  let maxCols = 0;
  const csvRows = [];

  for (const race of allRaces) {
    if (!race.sectionals || !race.sectionals.rows || race.sectionals.rows.length === 0) continue;

    const raceLabel = race.metadata?.heading || race.metadata?.pageTitle || race.raceUrl;
    const distance = race.metadata?.distance || '';
    const time = race.metadata?.time || '';
    const headers = race.sectionals.headers || [];

    for (const row of race.sectionals.rows) {
      const csvRow = [raceLabel, distance, time, ...headers.map((h, i) => row[i] || '')];
      if (row.length > headers.length) {
        for (let i = headers.length; i < row.length; i++) {
          csvRow.push(row[i]);
        }
      }
      csvRows.push(csvRow);
      maxCols = Math.max(maxCols, csvRow.length);
    }
  }

  // Build header line
  const sampleHeaders = allRaces.find(r => r.sectionals?.headers?.length > 0)?.sectionals?.headers || [];
  const headerLine = ['Race', 'Distance', 'Time', ...sampleHeaders];
  while (headerLine.length < maxCols) headerLine.push(`Col${headerLine.length}`);
  lines.push(headerLine.map(h => `"${h}"`).join(','));

  // Build data lines
  for (const row of csvRows) {
    while (row.length < maxCols) row.push('');
    lines.push(row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
  }

  return lines.join('\n');
}

async function main() {
  console.log('=== Curragh Sectional Data Scraper ===');
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Max races: ${MAX_RACES === Infinity ? 'unlimited' : MAX_RACES}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Step 1: Get race meeting links from the Curragh results page
    console.log('\n--- Step 1: Finding race meetings ---');
    const meetingLinks = await getRaceMeetingLinks(page);

    // Step 2: For each meeting, find individual race links
    console.log('\n--- Step 2: Finding individual races ---');
    let allRaceLinks = [];

    if (meetingLinks.length > 0) {
      for (const meeting of meetingLinks) {
        console.log(`\n  Checking meeting: ${meeting.text}`);
        const raceLinks = await getRaceLinksFromMeeting(page, meeting.href);
        console.log(`    Found ${raceLinks.length} race links`);
        allRaceLinks.push(...raceLinks.map(r => ({ ...r, meeting: meeting.text })));
      }
    }

    // Also check for direct race links on the main results page
    const directLinks = await getIndividualRaceLinks(page);
    if (directLinks.length > 0) {
      console.log(`\n  Found ${directLinks.length} direct race links on results page`);
      for (const dl of directLinks) {
        if (!allRaceLinks.some(r => r.href === dl.href)) {
          allRaceLinks.push(dl);
        }
      }
    }

    // If no links found via either method, dump page for manual inspection
    if (allRaceLinks.length === 0) {
      console.log('\n  [!] No race links found automatically.');
      console.log('  Check output/step1_results_page.png and output/step1_page_text.txt');
      console.log('  The page structure may have changed — update selectors in the script.');

      // Try one more approach: grab ALL links on the page
      const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent.trim().replace(/\s+/g, ' ').substring(0, 100)
        }));
      });
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'all_links_debug.json'),
        JSON.stringify(allLinks, null, 2)
      );
      console.log(`  Dumped ${allLinks.length} links to output/all_links_debug.json for inspection`);
    }

    console.log(`\n  Total race links to scrape: ${allRaceLinks.length}`);

    // Limit if MAX_RACES set
    const racesToScrape = allRaceLinks.slice(0, MAX_RACES);

    // Step 3: Scrape each race
    console.log('\n--- Step 3: Scraping sectional data ---');
    const allResults = [];

    for (let i = 0; i < racesToScrape.length; i++) {
      const race = racesToScrape[i];
      const result = await scrapeRace(page, race.href, i + 1);
      if (race.meeting) result.meeting = race.meeting;
      allResults.push(result);

      // Be polite — small delay between requests
      await delay(1500);
    }

    // Step 4: Save results
    console.log('\n--- Step 4: Saving results ---');

    // Save full JSON
    const jsonPath = path.join(OUTPUT_DIR, 'curragh_sectionals.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));
    console.log(`  JSON saved to: ${jsonPath}`);

    // Save CSV
    const csv = buildCSV(allResults);
    const csvPath = path.join(OUTPUT_DIR, 'curragh_sectionals.csv');
    fs.writeFileSync(csvPath, csv);
    console.log(`  CSV saved to: ${csvPath}`);

    // Summary
    const withSectionals = allResults.filter(r => r.hasSectionals);
    const withData = allResults.filter(r => r.sectionals?.rows?.length > 0);
    console.log(`\n=== Summary ===`);
    console.log(`  Total races scraped: ${allResults.length}`);
    console.log(`  Races with sectionals tab: ${withSectionals.length}`);
    console.log(`  Races with sectional data: ${withData.length}`);
    console.log(`  Output directory: ${OUTPUT_DIR}`);

  } catch (err) {
    console.error('Fatal error:', err);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'error_screenshot.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
