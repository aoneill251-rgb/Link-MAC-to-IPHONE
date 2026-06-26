/**
 * Parses the raw text dump from the scraper into structured CSVs.
 *
 * Usage: node parse.js [input_file]
 *   Defaults to ./output/curragh_all_raw.txt
 *
 * Outputs:
 *   ./output/sectionals_parsed.csv  — one row per horse per race with furlong splits
 *   ./output/raceiq_parsed.csv      — one row per horse per race with RaceIQ metrics
 */

const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || path.join(__dirname, 'output', 'curragh_all_raw.txt');
const OUTPUT_DIR = path.join(__dirname, 'output');

const raw = fs.readFileSync(INPUT, 'utf-8');

// Split into race blocks
const raceBlocks = raw.split(/={60,}/).filter(b => b.trim());

function parseRaceHeader(lines) {
  const header = {};
  for (const line of lines) {
    const m = line.match(/^(DATE|TIME|RACE|GOING|DISTANCE|RUNNERS|URL):\s*(.*)/);
    if (m) header[m[1].toLowerCase()] = m[2].trim();
  }
  return header;
}

function parseHorseList(lines, startIdx) {
  // Parses the horse list that starts after "Horse Information"
  // Pattern: position, [margin], cloth_number, (draw), horse_name
  const horses = [];
  let i = startIdx;

  const posPattern = /^(\d+)(st|nd|rd|th)$/;
  const marginPattern = /^(Neck|Head|Short Head|Dead Heat|Nose|\d[\d\s\/]*l?)$/i;

  while (i < lines.length) {
    const line = lines[i];

    // Stop if we hit furlong headers
    if (/^\d+f$/.test(line)) break;
    if (line === 'Total Time') break;

    const posMatch = line.match(posPattern);
    if (posMatch) {
      const horse = { pos: parseInt(posMatch[1]), posLabel: line };
      i++;

      // Check for margin (2nd place onwards)
      if (i < lines.length && marginPattern.test(lines[i])) {
        horse.margin = lines[i];
        i++;
      }

      // Cloth number
      if (i < lines.length && /^\d+$/.test(lines[i])) {
        horse.cloth = parseInt(lines[i]);
        i++;
      }

      // Draw in parentheses
      if (i < lines.length && /^\(\d+\)$/.test(lines[i])) {
        horse.draw = parseInt(lines[i].replace(/[()]/g, ''));
        i++;
      }

      // Horse name
      if (i < lines.length && !posPattern.test(lines[i]) && !/^\d+f$/.test(lines[i])) {
        horse.name = lines[i];
        i++;
      }

      horses.push(horse);
    } else {
      i++;
    }
  }

  return { horses, nextIdx: i };
}

function parseFurlongHeaders(lines, startIdx) {
  const headers = [];
  let i = startIdx;
  while (i < lines.length && /^\d+f$/.test(lines[i])) {
    headers.push(lines[i]);
    i++;
  }
  if (i < lines.length && lines[i] === 'Total Time') {
    headers.push('Total Time');
    i++;
  }
  return { headers, nextIdx: i };
}

function parseSectionalRows(lines, startIdx, numFurlongs, numHorses) {
  // Each horse block:
  //   For each furlong: time_value, "Nth | +X.XX"
  //   Then: total_time (e.g. "1m, 16.09s"), "FSP: XX.XX%"
  //   Then chart junk: 1.0, 2.0, ... 7.0, 20, 40, 60, 80, 100
  const rows = [];
  let i = startIdx;

  for (let h = 0; h < numHorses && i < lines.length; h++) {
    const row = { splits: [], positions: [] };

    // Parse furlong splits
    for (let f = 0; f < numFurlongs; f++) {
      if (i >= lines.length) break;
      const timeVal = lines[i]; i++;
      if (i >= lines.length) break;
      const posVal = lines[i]; i++;
      row.splits.push(timeVal);
      row.positions.push(posVal);
    }

    // Total time
    if (i < lines.length && lines[i].match(/^\d+m,\s*[\d.]+s$/)) {
      row.totalTime = lines[i]; i++;
    }

    // FSP
    if (i < lines.length && lines[i].match(/^FSP:\s*[\d.]+%$/)) {
      row.fsp = lines[i].replace('FSP: ', ''); i++;
    }

    // Skip chart data (1.0, 2.0, ... and 20, 40, 60, 80, 100)
    while (i < lines.length) {
      const val = lines[i];
      if (/^[\d.]+$/.test(val) && (parseFloat(val) <= 8 || [20, 40, 60, 80, 100].includes(parseFloat(val)))) {
        i++;
      } else {
        break;
      }
    }

    rows.push(row);
  }

  return rows;
}

function parseSectionalsBlock(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Find "Horse Information" marker
  const hiIdx = lines.indexOf('Horse Information');
  if (hiIdx === -1) return null;

  // Parse horses
  const { horses, nextIdx } = parseHorseList(lines, hiIdx + 1);
  if (horses.length === 0) return null;

  // Parse furlong headers
  const { headers: furlongHeaders, nextIdx: dataStart } = parseFurlongHeaders(lines, nextIdx);
  if (furlongHeaders.length === 0) return null;

  const numFurlongs = furlongHeaders.filter(h => h !== 'Total Time').length;

  // Parse sectional data rows
  const sectionalRows = parseSectionalRows(lines, dataStart, numFurlongs, horses.length);

  return { horses, furlongHeaders, sectionalRows };
}

function parseRaceIQBlock(text) {
  // Extract RaceIQ metrics from "By Horse" section
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Look for "By Horse" section
  const byHorseIdx = lines.indexOf('By Horse');
  if (byHorseIdx === -1) return null;

  // Also extract "By Metric" data
  const metrics = {};

  // Parse "By Metric" section for each metric type
  const metricNames = ['0-20MPH', 'Stride Length', 'Finishing Speed %', 'Top Speed'];

  for (const metricName of metricNames) {
    const metricIdx = lines.indexOf(metricName);
    if (metricIdx === -1) continue;

    // After metric name, look for POS./HORSE/RANK/DATA header
    let i = metricIdx + 1;
    // Skip to horse entries
    while (i < lines.length && !['1st', '2nd', '3rd', '4th', '5th', '6th'].some(p => lines[i] === p)) {
      i++;
    }

    // Collect horse names in order for this metric
    const horseNames = [];
    while (i < lines.length && /^(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|\d+th)$/.test(lines[i])) {
      i++; // skip position
      if (i < lines.length) {
        horseNames.push(lines[i]);
        i++;
      }
    }

    // Now parse the rank/data pairs
    // Pattern: rank_number, ordinal_suffix (ST/ND/RD/TH), value, unit
    const values = [];
    while (i < lines.length && lines[i] !== 'Median' && !metricNames.includes(lines[i])) {
      const rankMatch = lines[i].match(/^(\d+)$/);
      if (rankMatch) {
        const rank = rankMatch[1];
        i++;
        if (i < lines.length && /^(ST|ND|RD|TH)$/.test(lines[i])) {
          i++; // skip ordinal
        }
        if (i < lines.length) {
          values.push({ rank, value: lines[i] });
          i++;
        }
      } else {
        i++;
      }
    }

    metrics[metricName] = { horseNames, values };
  }

  // Parse "By Horse" section for cleaner per-horse data
  const horseData = [];
  let i = byHorseIdx + 1;

  // Skip "Show All"
  while (i < lines.length && (lines[i] === 'Show All' || lines[i] === 'By Horse')) i++;

  while (i < lines.length) {
    // Check if this line is a horse name (not a keyword)
    const isKeyword = ['METRIC', 'RANK', 'DATA', 'Median', 'ST', 'ND', 'RD', 'TH',
      'Sectionals tutorial', 'Time Index:', 'Copyright'].some(k => lines[i] === k || lines[i].startsWith(k));
    const isOrdinal = /^(ST|ND|RD|TH)$/.test(lines[i]);
    const isNumber = /^[\d.]+$/.test(lines[i]);

    if (!isKeyword && !isOrdinal && !isNumber && lines[i] !== 'Median' &&
        !lines[i].startsWith('Sectionals') && !lines[i].startsWith('Time Index') &&
        !lines[i].startsWith('Copyright') && !lines[i].startsWith('Pos.') &&
        !lines[i].startsWith('Horse Information')) {

      const horseName = lines[i];
      i++;

      // Skip METRIC/RANK/DATA header
      while (i < lines.length && ['METRIC', 'RANK', 'DATA'].includes(lines[i])) i++;

      const horseMetrics = {};

      // Parse metric entries until we hit "Median" or next horse
      while (i < lines.length && lines[i] !== 'Median') {
        const metricLabel = lines[i];
        i++;

        // Rank number
        if (i < lines.length && /^\d+$/.test(lines[i])) {
          const rank = lines[i]; i++;
          // Ordinal
          if (i < lines.length && /^(ST|ND|RD|TH)$/.test(lines[i])) i++;
          // Value with unit
          if (i < lines.length) {
            horseMetrics[metricLabel] = { rank, value: lines[i] };
            i++;
          }
        } else {
          break;
        }
      }

      // Skip "Median"
      if (i < lines.length && lines[i] === 'Median') i++;

      if (Object.keys(horseMetrics).length > 0) {
        horseData.push({ name: horseName, metrics: horseMetrics });
      }
    } else {
      // Stop at sectionals section
      if (lines[i] === 'Sectionals tutorial' || lines[i].startsWith('Time Index')) break;
      i++;
    }
  }

  return horseData.length > 0 ? horseData : null;
}

// ---- Main ----

const allSectionals = [];
const allRaceIQ = [];

for (const block of raceBlocks) {
  const lines = block.split('\n').map(l => l.trim());
  const header = parseRaceHeader(lines);

  // Split into RaceIQ and Sectionals sections
  const raceIQStart = block.indexOf('--- RACEiQ COMPARISON ---');
  const secStart = block.indexOf('--- SECTIONALS ---');

  // Parse Sectionals
  if (secStart !== -1) {
    const secText = block.substring(secStart);
    const parsed = parseSectionalsBlock(secText);
    if (parsed) {
      for (let h = 0; h < parsed.horses.length; h++) {
        const horse = parsed.horses[h];
        const secRow = parsed.sectionalRows[h] || {};
        const row = {
          date: header.date || '',
          time: header.time || '',
          race: header.race || '',
          going: header.going || '',
          distance: header.distance || '',
          runners: header.runners || '',
          pos: horse.posLabel || '',
          margin: horse.margin || '',
          cloth: horse.cloth || '',
          draw: horse.draw || '',
          horse: horse.name || '',
        };

        // Add furlong splits
        const furlongs = parsed.furlongHeaders.filter(h => h !== 'Total Time');
        for (let f = 0; f < furlongs.length; f++) {
          row[`${furlongs[f]}_time`] = secRow.splits?.[f] || '';
          row[`${furlongs[f]}_pos`] = secRow.positions?.[f] || '';
        }

        row.totalTime = secRow.totalTime || '';
        row.fsp = secRow.fsp || '';

        allSectionals.push(row);
      }
    }
  }

  // Parse RaceIQ (from the "By Horse" view)
  if (raceIQStart !== -1) {
    const endIdx = secStart !== -1 ? secStart : block.length;
    const raceIQText = block.substring(raceIQStart, endIdx);
    const parsed = parseRaceIQBlock(raceIQText);
    if (parsed) {
      for (const horse of parsed) {
        const row = {
          date: header.date || '',
          time: header.time || '',
          race: header.race || '',
          going: header.going || '',
          distance: header.distance || '',
          runners: header.runners || '',
          horse: horse.name,
        };
        for (const [metric, data] of Object.entries(horse.metrics)) {
          row[`${metric}_rank`] = data.rank;
          row[`${metric}_value`] = data.value;
        }
        allRaceIQ.push(row);
      }
    }
  }
}

// ---- Write CSVs ----

function toCSV(rows) {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  // Collect all keys across all rows
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  const header = keys.map(k => `"${k}"`).join(',');
  const dataLines = rows.map(row =>
    keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(',')
  );
  return [header, ...dataLines].join('\n');
}

// Sectionals CSV
const secCSV = toCSV(allSectionals);
if (secCSV) {
  const p = path.join(OUTPUT_DIR, 'sectionals_parsed.csv');
  fs.writeFileSync(p, secCSV);
  console.log(`Sectionals: ${allSectionals.length} rows -> ${p}`);
} else {
  console.log('No sectional data parsed.');
}

// RaceIQ CSV
const iqCSV = toCSV(allRaceIQ);
if (iqCSV) {
  const p = path.join(OUTPUT_DIR, 'raceiq_parsed.csv');
  fs.writeFileSync(p, iqCSV);
  console.log(`RaceIQ: ${allRaceIQ.length} rows -> ${p}`);
} else {
  console.log('No RaceIQ data parsed.');
}

console.log('\nDone!');
