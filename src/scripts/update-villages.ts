import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AdminItem } from '../types/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function updateVillagesFromCsv(): {
  success: boolean;
  totalParsed: number;
  added: number;
  updated: number;
  unmodified: number;
  removed: number;
  diffs: Array<{ code: string; type: string; before?: any; after?: any }>;
} {
  const dataDir = path.resolve(__dirname, '..', 'data');
  const seedDir = path.join(dataDir, 'seed');
  const csvPath = path.join(dataDir, 'CambodiaVillagesList.csv');
  const seedVillagesPath = path.join(seedDir, 'villages.json');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  // Read existing villages.json
  const existingMap = new Map<string, AdminItem>();
  if (fs.existsSync(seedVillagesPath)) {
    const existing: AdminItem[] = JSON.parse(fs.readFileSync(seedVillagesPath, 'utf-8'));
    for (const v of existing) {
      if (v.code) existingMap.set(v.code, v);
    }
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  // Header: province_code,district_code,commune_code,village_code,village_kh,village_en
  const startIndex = lines[0].toLowerCase().includes('village_code') ? 1 : 0;

  const newVillages: AdminItem[] = [];
  const seenCodes = new Set<string>();

  const diffs: Array<{ code: string; type: string; before?: any; after?: any }> = [];
  let added = 0;
  let updated = 0;
  let unmodified = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 6) continue;

    const cCode = cols[2].trim();
    const vCode = cols[3].trim();
    const vKh = cols[4].trim();
    const vEn = cols[5].trim();

    if (!cCode) continue;

    const cId = parseInt(cCode, 10);

    // Resolve unassigned or hyphenated codes (e.g. 0506140-)
    let resolvedVCode = vCode;
    let resolvedVId = parseInt(vCode.replace(/[^0-9]/g, ''), 10);
    if (vCode.includes('-') || !vCode || isNaN(resolvedVId)) {
      let subIndex = 1;
      while (seenCodes.has(`${cCode}${String(subIndex).padStart(2, '0')}`)) {
        subIndex++;
      }
      resolvedVCode = `${cCode}${String(subIndex).padStart(2, '0')}`;
      resolvedVId = parseInt(resolvedVCode, 10);
    }

    if (seenCodes.has(resolvedVCode)) {
      // Deduplicate collision by assigning next available sequential sub-code
      let subIndex = 1;
      while (seenCodes.has(`${cCode}${String(subIndex).padStart(2, '0')}`)) {
        subIndex++;
      }
      resolvedVCode = `${cCode}${String(subIndex).padStart(2, '0')}`;
      resolvedVId = parseInt(resolvedVCode, 10);
    }

    const item: AdminItem = {
      id: resolvedVId,
      code: resolvedVCode,
      parentId: cId,
      name: vEn,
      name_en: vEn,
      name_km: vKh,
      level: 'village',
      typeKm: 'ភូមិ',
    };

    if (existingMap.has(resolvedVCode)) {
      const prev = existingMap.get(resolvedVCode)!;
      const isChanged =
        prev.name !== item.name ||
        prev.name_en !== item.name_en ||
        prev.name_km !== item.name_km ||
        prev.parentId !== item.parentId;

      if (isChanged) {
        updated++;
        diffs.push({
          code: resolvedVCode,
          type: 'updated',
          before: { name_km: prev.name_km, name_en: prev.name_en },
          after: { name_km: item.name_km, name_en: item.name_en },
        });
      } else {
        unmodified++;
      }
    } else {
      added++;
      diffs.push({
        code: resolvedVCode,
        type: 'added',
        after: { name_km: item.name_km, name_en: item.name_en },
      });
    }

    newVillages.push(item);
    seenCodes.add(resolvedVCode);
  }

  // Check if any existing were removed
  let removed = 0;
  for (const [code, item] of existingMap.entries()) {
    if (!seenCodes.has(code)) {
      removed++;
      diffs.push({
        code: code,
        type: 'removed',
        before: { name_km: item.name_km, name_en: item.name_en },
      });
    }
  }

  // Sort strictly by id ascending
  newVillages.sort((a, b) => a.id - b.id);

  // Write to seed file
  fs.writeFileSync(seedVillagesPath, JSON.stringify(newVillages, null, 2), 'utf-8');

  return {
    success: true,
    totalParsed: newVillages.length,
    added,
    updated,
    unmodified,
    removed,
    diffs,
  };
}

// CLI direct execution
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('update-villages.ts') || process.argv[1].endsWith('update-villages.js'));

if (isDirectRun) {
  console.log('🔄 Updating villages.json from CambodiaVillagesList.csv...');
  const res = updateVillagesFromCsv();
  console.log(`✅ Update complete!`);
  console.log(`   - Total Villages: ${res.totalParsed}`);
  console.log(`   - Newly Added:    ${res.added}`);
  console.log(`   - Updated:        ${res.updated}`);
  console.log(`   - Unchanged:      ${res.unmodified}`);
  console.log(`   - Removed:        ${res.removed}`);
  if (res.diffs.length > 0) {
    console.log(`\n📋 First 10 diff entries:`);
    console.log(JSON.stringify(res.diffs.slice(0, 10), null, 2));
  }
}
