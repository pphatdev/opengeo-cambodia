import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AdminItem } from '../types/admin.js';
import { DEFAULT_PROVINCE_COORDINATES, KRONG_CODES } from '../data/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function convertCsvToSeedFiles(): {
  provinces: number;
  districts: number;
  communes: number;
  villages: number;
} {
  const startTime = performance.now();
  const dataDir = path.resolve(__dirname, '..', 'data');
  const seedDir = path.join(dataDir, 'seed');
  const csvPath = path.join(dataDir, 'CambodiaGeographicalList.csv');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir, { recursive: true });
  }

  // Pre-load existing province centroid coordinates if available
  const provinceCoords = new Map<string, { lat: number; lon: number; typeKm?: string }>();
  const seedProvincesPath = path.join(seedDir, 'provinces.json');
  if (fs.existsSync(seedProvincesPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(seedProvincesPath, 'utf-8')) as AdminItem[];
      for (const p of existing) {
        if (p.code && p.lat && p.lon) {
          provinceCoords.set(p.code, { lat: p.lat, lon: p.lon, typeKm: p.typeKm });
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback to official Cambodian provincial centroid coordinates
  for (const [code, coord] of Object.entries(DEFAULT_PROVINCE_COORDINATES)) {
    if (!provinceCoords.has(code)) {
      provinceCoords.set(code, coord);
    }
  }

  console.log(`📖 Reading ${csvPath}...`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const provinceMap = new Map<string, AdminItem>();
  const districtMap = new Map<string, AdminItem>();
  const communeMap = new Map<string, AdminItem>();
  const villageMap = new Map<string, AdminItem>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    if (cols.length < 12) continue;

    const pCode = cols[0].trim();
    const pKh = cols[1].trim();
    const pEn = cols[2].trim();

    const dCode = cols[3].trim();
    const dKh = cols[4].trim();
    const dEn = cols[5].trim();

    const cCode = cols[6].trim();
    const cKh = cols[7].trim();
    const cEn = cols[8].trim();

    const vCode = cols[9].trim();
    const vKh = cols[10].trim();
    const vEn = cols[11].trim();

    const pId = parseInt(pCode, 10);
    const dId = parseInt(dCode, 10);
    const cId = parseInt(cCode, 10);
    const vId = parseInt(vCode, 10);

    // 1. Province (Tier 1)
    if (!provinceMap.has(pCode)) {
      const coords = provinceCoords.get(pCode);
      const isCapital = pCode === '12';
      provinceMap.set(pCode, {
        id: pId,
        code: pCode,
        name: pEn,
        name_en: pEn,
        name_km: pKh,
        typeKm: coords?.typeKm || (isCapital ? 'រាជធានី' : 'ខេត្ត'),
        level: 'province',
        lat: coords?.lat,
        lon: coords?.lon,
      });
    }

    // 2. District / Khan / Krong (Tier 2)
    const isKhan = pCode === '12';
    const isKrong = KRONG_CODES.has(dCode) || dEn.toLowerCase().startsWith('krong ') || dKh.startsWith('ក្រុង');

    if (!districtMap.has(dCode)) {
      districtMap.set(dCode, {
        id: dId,
        code: dCode,
        parentId: pId,
        name: dEn,
        name_en: dEn,
        name_km: dKh,
        typeKm: isKhan ? 'ខណ្ឌ' : isKrong ? 'ក្រុង' : 'ស្រុក',
        level: 'district',
      });
    }

    // 3. Commune / Sangkat (Tier 3)
    if (!communeMap.has(cCode)) {
      const isSangkat = isKhan || isKrong;
      communeMap.set(cCode, {
        id: cId,
        code: cCode,
        parentId: dId,
        name: cEn,
        name_en: cEn,
        name_km: cKh,
        typeKm: isSangkat ? 'សង្កាត់' : 'ឃុំ',
        level: 'commune',
      });
    }

    // 4. Village / Phum (Tier 4)
    let resolvedVCode = vCode;
    let resolvedVId = parseInt(vCode.replace(/[^0-9]/g, ''), 10);
    if (vCode.includes('-') || !vCode || isNaN(resolvedVId)) {
      let subIndex = 1;
      while (villageMap.has(`${cCode}${String(subIndex).padStart(2, '0')}`)) {
        subIndex++;
      }
      resolvedVCode = `${cCode}${String(subIndex).padStart(2, '0')}`;
      resolvedVId = parseInt(resolvedVCode, 10);
    }

    if (!villageMap.has(resolvedVCode)) {
      villageMap.set(resolvedVCode, {
        id: resolvedVId,
        code: resolvedVCode,
        parentId: cId,
        name: vEn,
        name_en: vEn,
        name_km: vKh,
        typeKm: 'ភូមិ',
        level: 'village',
      });
    }
  }

  const provinces = Array.from(provinceMap.values()).sort((a, b) => a.id - b.id);
  const districts = Array.from(districtMap.values()).sort((a, b) => a.id - b.id);
  const communes = Array.from(communeMap.values()).sort((a, b) => a.id - b.id);
  const villages = Array.from(villageMap.values()).sort((a, b) => a.id - b.id);

  console.log(`Writing seed files to ${seedDir}...`);
  fs.writeFileSync(path.join(seedDir, 'provinces.json'), JSON.stringify(provinces, null, 2), 'utf-8');
  fs.writeFileSync(path.join(seedDir, 'districts.json'), JSON.stringify(districts, null, 2), 'utf-8');
  fs.writeFileSync(path.join(seedDir, 'communes.json'), JSON.stringify(communes, null, 2), 'utf-8');
  fs.writeFileSync(path.join(seedDir, 'villages.json'), JSON.stringify(villages, null, 2), 'utf-8');

  const duration = (performance.now() - startTime).toFixed(1);
  console.log(`
🎉 Successfully converted CambodiaGeographicalList.csv to seed files in ${duration}ms!
---------------------------------------------------------------------------------
  🏛️  Provinces:  ${provinces.length} (Saved to provinces.json)
  🏘️  Districts:  ${districts.length} (Saved to districts.json)
  🏡 Communes:   ${communes.length} (Saved to communes.json)
  📍 Villages:   ${villages.length} (Saved to villages.json)
---------------------------------------------------------------------------------
  `);

  return {
    provinces: provinces.length,
    districts: districts.length,
    communes: communes.length,
    villages: villages.length,
  };
}

// Auto-run when executed directly
if (process.argv[1] && process.argv[1].endsWith('convert-csv.ts')) {
  convertCsvToSeedFiles();
}
