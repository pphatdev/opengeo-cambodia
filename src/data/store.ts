import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AdminItem, AdminLevel, AdminStats, HierarchyPath } from '../types/admin.js';
import seedProvinces from './seed/provinces.json' with { type: 'json' };
import seedDistricts from './seed/districts.json' with { type: 'json' };
import seedCommunes from './seed/communes.json' with { type: 'json' };
import seedVillages from './seed/villages.json' with { type: 'json' };

function resolveCurrentDir(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Edge/Cloudflare Workers runtime
  }
  return '';
}

const currentDir = resolveCurrentDir();

export const DEFAULT_PROVINCE_COORDINATES: Record<string, { lat: number; lon: number }> = {
  '01': { lat: 13.6672, lon: 102.8975 }, // Banteay Meanchey
  '02': { lat: 13.0957, lon: 103.2022 }, // Battambang
  '03': { lat: 11.9924, lon: 105.4645 }, // Kampong Cham
  '04': { lat: 12.2500, lon: 104.6667 }, // Kampong Chhnang
  '05': { lat: 11.4532, lon: 104.5209 }, // Kampong Speu
  '06': { lat: 12.7111, lon: 104.8887 }, // Kampong Thom
  '07': { lat: 10.6104, lon: 104.1815 }, // Kampot
  '08': { lat: 11.4395, lon: 104.9576 }, // Kandal
  '09': { lat: 11.6153, lon: 102.9838 }, // Koh Kong
  '10': { lat: 12.4881, lon: 106.0188 }, // Kratie
  '11': { lat: 12.4558, lon: 107.1881 }, // Mondul Kiri
  '12': { lat: 11.5564, lon: 104.9282 }, // Phnom Penh
  '13': { lat: 13.8073, lon: 104.9805 }, // Preah Vihear
  '14': { lat: 11.4851, lon: 105.3253 }, // Prey Veng
  '15': { lat: 12.5388, lon: 103.9192 }, // Pursat
  '16': { lat: 13.7394, lon: 107.0016 }, // Ratanak Kiri
  '17': { lat: 13.3671, lon: 103.8448 }, // Siemreap
  '18': { lat: 10.6275, lon: 103.5221 }, // Sihanoukville
  '19': { lat: 13.5259, lon: 105.9683 }, // Stung Treng
  '20': { lat: 11.0879, lon: 105.7993 }, // Svay Rieng
  '21': { lat: 10.9908, lon: 104.7850 }, // Takeo
  '22': { lat: 14.1818, lon: 103.5176 }, // Otdar Meanchey
  '23': { lat: 10.4828, lon: 104.3167 }, // Kep
  '24': { lat: 12.8489, lon: 102.6093 }, // Pailin
  '25': { lat: 11.8891, lon: 105.6592 }, // Tboung Khmum
};

export const KRONG_CODES = new Set([
  '0106', // Serei Saophoan
  '0110', // Paoy Paet
  '0203', // Battambang
  '0305', // Kampong Cham
  '0403', // Kampong Chhnang
  '0502', // Chhbar Mon
  '0509', // Odong Mae Chey
  '0603', // Stueng Saen
  '0708', // Kampot
  '0709', // Bokor
  '0811', // Ta Khmau
  '0812', // Sampov Poun
  '0813', // Arak Ksat / Akrey Ksat
  '0904', // Khemarak Phoumin
  '1002', // Kracheh
  '1105', // Sen Monorom
  '1308', // Preah Vihear
  '1410', // Prey Veng
  '1505', // Pursat / Pousat
  '1602', // Ban Lung
  '1710', // Siem Reap / Siem Reab
  '1715', // Run Ta Aek Techo Sen
  '1801', // Preah Sihanouk
  '1805', // Koh Rong / Kaoh Rung
  '1904', // Stueng Traeng
  '2006', // Svay Rieng
  '2008', // Bavet
  '2108', // Doun Kaev
  '2204', // Samraong
  '2302', // Kep / Kaeb
  '2401', // Pailin
  '2506', // Suong
]);

export class AdminStore {
  private static instance: AdminStore | null = null;

  private provinces: AdminItem[] = [];
  private districts: AdminItem[] = [];
  private communes: AdminItem[] = [];
  private villages: AdminItem[] = [];

  // O(1) Lookups
  private itemById = new Map<number, AdminItem>();
  private itemByCode = new Map<string, AdminItem>();
  private districtsByProvince = new Map<number, AdminItem[]>();
  private communesByDistrict = new Map<number, AdminItem[]>();
  private villagesByCommune = new Map<number, AdminItem[]>();

  private lastSyncAt: string | null = null;
  private isLoaded = false;

  private constructor() {
    this.loadData();
  }

  public static getInstance(): AdminStore {
    if (!AdminStore.instance) {
      AdminStore.instance = new AdminStore();
    }
    return AdminStore.instance;
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Normalize search string: lowercase, remove accents, spaces, and punctuation
   */
  public static normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[\s\-_'’.]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Parse CSV line with quote handling
   */
  public static parseCsvLine(line: string): string[] {
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

  /**
   * Load administrative boundaries from the 4 official CSV files.
   * Read-only: never modifies, overwrites, or regenerates seed files on server startup.
   */
  public loadData(): void {
    // 1. If in a Node.js filesystem environment, try loading from the 4 official CSV files
    if (currentDir && typeof fs?.existsSync === 'function') {
      try {
        const possibleDataDirs = [
          path.resolve(currentDir),
          path.resolve(currentDir, '..', '..', 'src', 'data'),
          path.resolve(process.cwd(), 'src', 'data'),
          path.resolve(process.cwd(), 'dist', 'data'),
        ];

        let dataDir = path.resolve(currentDir);
        for (const candidate of possibleDataDirs) {
          if (fs.existsSync(path.join(candidate, 'CambodiaVillagesList.csv'))) {
            dataDir = candidate;
            break;
          }
        }

        const provinceCsv = path.join(dataDir, 'CambodiaProvinceList.csv');
        const districtCsv = path.join(dataDir, 'CambodiaDistrictList.csv');
        const communeCsv = path.join(dataDir, 'CambodiaCommuneList.csv');
        const villageCsv = path.join(dataDir, 'CambodiaVillagesList.csv');

        if (
          fs.existsSync(provinceCsv) &&
          fs.existsSync(districtCsv) &&
          fs.existsSync(communeCsv) &&
          fs.existsSync(villageCsv)
        ) {
          this.loadFromFourCsvs(provinceCsv, districtCsv, communeCsv, villageCsv);
          this.rebuildIndexes();
          this.isLoaded = true;
          return;
        }
      } catch (err) {
        console.warn('[AdminStore] Local CSV read unavailable, using bundled datasets:', err);
      }
    }

    // 2. Edge / Cloudflare Workers / Serverless: load directly from pre-bundled canonical seed JSON
    this.provinces = seedProvinces as AdminItem[];
    this.districts = seedDistricts as AdminItem[];
    this.communes = seedCommunes as AdminItem[];
    this.villages = seedVillages as AdminItem[];

    this.rebuildIndexes();
    this.isLoaded = true;
  }

  /**
   * Parse the 4 dedicated CSV files directly into memory without modifying any seed files on disk
   */
  private loadFromFourCsvs(
    provinceCsv: string,
    districtCsv: string,
    communeCsv: string,
    villageCsv: string
  ): void {
    // 1. Provinces (CambodiaProvinceList.csv)
    const pLines = fs.readFileSync(provinceCsv, 'utf-8').split(/\r?\n/);
    const pStartIndex = pLines[0].toLowerCase().includes('province_code') ? 1 : 0;
    const provinces: AdminItem[] = [];

    for (let i = pStartIndex; i < pLines.length; i++) {
      const line = pLines[i].trim();
      if (!line) continue;
      const cols = AdminStore.parseCsvLine(line);
      if (cols.length < 3) continue;

      const code = cols[0].trim();
      const kh = cols[1].trim();
      const en = cols[2].trim();
      if (!code) continue;

      const coord = DEFAULT_PROVINCE_COORDINATES[code];
      provinces.push({
        id: parseInt(code, 10),
        code,
        name: en,
        name_en: en,
        name_km: kh,
        level: 'province',
        lat: coord?.lat,
        lon: coord?.lon,
        typeKm: code === '12' ? 'រាជធានី' : 'ខេត្ត',
      });
    }

    // 2. Districts (CambodiaDistrictList.csv)
    const dLines = fs.readFileSync(districtCsv, 'utf-8').split(/\r?\n/);
    const dStartIndex = dLines[0].toLowerCase().includes('district_code') ? 1 : 0;
    const districts: AdminItem[] = [];
    const districtTypeKmMap = new Map<string, string>();

    for (let i = dStartIndex; i < dLines.length; i++) {
      const line = dLines[i].trim();
      if (!line) continue;
      const cols = AdminStore.parseCsvLine(line);
      if (cols.length < 4) continue;

      const pCode = cols[0].trim();
      const dCode = cols[1].trim();
      const dKh = cols[2].trim();
      const dEn = cols[3].trim();
      if (!dCode) continue;

      const isKhan = pCode === '12';
      const isKrong = KRONG_CODES.has(dCode) || dEn.toLowerCase().startsWith('krong ') || dKh.startsWith('ក្រុង');
      const typeKm = isKhan ? 'ខណ្ឌ' : isKrong ? 'ក្រុង' : 'ស្រុក';
      districtTypeKmMap.set(dCode, typeKm);

      districts.push({
        id: parseInt(dCode, 10),
        code: dCode,
        parentId: parseInt(pCode, 10),
        name: dEn,
        name_en: dEn,
        name_km: dKh,
        level: 'district',
        typeKm,
      });
    }

    // 3. Communes (CambodiaCommuneList.csv)
    const cLines = fs.readFileSync(communeCsv, 'utf-8').split(/\r?\n/);
    const cStartIndex = cLines[0].toLowerCase().includes('commune_code') ? 1 : 0;
    const communes: AdminItem[] = [];

    for (let i = cStartIndex; i < cLines.length; i++) {
      const line = cLines[i].trim();
      if (!line) continue;
      const cols = AdminStore.parseCsvLine(line);
      if (cols.length < 5) continue;

      const dCode = cols[1].trim();
      const cCode = cols[2].trim();
      const cKh = cols[3].trim();
      const cEn = cols[4].trim();
      if (!cCode) continue;

      const districtType = districtTypeKmMap.get(dCode);
      const isSangkat = districtType === 'ខណ្ឌ' || districtType === 'ក្រុង';
      const typeKm = isSangkat ? 'សង្កាត់' : 'ឃុំ';

      communes.push({
        id: parseInt(cCode, 10),
        code: cCode,
        parentId: parseInt(dCode, 10),
        name: cEn,
        name_en: cEn,
        name_km: cKh,
        level: 'commune',
        typeKm,
      });
    }

    // 4. Villages (CambodiaVillagesList.csv)
    const vLines = fs.readFileSync(villageCsv, 'utf-8').split(/\r?\n/);
    const vStartIndex = vLines[0].toLowerCase().includes('village_code') ? 1 : 0;
    const villages: AdminItem[] = [];
    const seenVillageCodes = new Set<string>();

    for (let i = vStartIndex; i < vLines.length; i++) {
      const line = vLines[i].trim();
      if (!line) continue;
      const cols = AdminStore.parseCsvLine(line);
      if (cols.length < 6) continue;

      const cCode = cols[2].trim();
      const vCode = cols[3].trim();
      const vKh = cols[4].trim();
      const vEn = cols[5].trim();
      if (!cCode) continue;

      let resolvedVCode = vCode;
      let resolvedVId = parseInt(vCode.replace(/[^0-9]/g, ''), 10);
      if (vCode.includes('-') || !vCode || isNaN(resolvedVId)) {
        let subIndex = 1;
        while (seenVillageCodes.has(`${cCode}${String(subIndex).padStart(2, '0')}`)) {
          subIndex++;
        }
        resolvedVCode = `${cCode}${String(subIndex).padStart(2, '0')}`;
        resolvedVId = parseInt(resolvedVCode, 10);
      }

      if (seenVillageCodes.has(resolvedVCode)) {
        let subIndex = 1;
        while (seenVillageCodes.has(`${cCode}${String(subIndex).padStart(2, '0')}`)) {
          subIndex++;
        }
        resolvedVCode = `${cCode}${String(subIndex).padStart(2, '0')}`;
        resolvedVId = parseInt(resolvedVCode, 10);
      }

      seenVillageCodes.add(resolvedVCode);

      villages.push({
        id: resolvedVId,
        code: resolvedVCode,
        parentId: parseInt(cCode, 10),
        name: vEn,
        name_en: vEn,
        name_km: vKh,
        level: 'village',
        typeKm: 'ភូមិ',
      });
    }

    this.provinces = provinces.sort((a, b) => a.id - b.id);
    this.districts = districts.sort((a, b) => a.id - b.id);
    this.communes = communes.sort((a, b) => a.id - b.id);
    this.villages = villages.sort((a, b) => a.id - b.id);
    this.lastSyncAt = '2026-10-27T00:00:00.000Z';
    // Strictly in-memory: NO fs.writeFileSync! Seed datasets on disk remain untouched.
  }


  private rebuildIndexes(): void {
    this.itemById.clear();
    this.itemByCode.clear();
    this.districtsByProvince.clear();
    this.communesByDistrict.clear();
    this.villagesByCommune.clear();

    // Index provinces
    for (const p of this.provinces) {
      p.level = 'province';
      this.itemById.set(p.id, p);
      if (p.code) this.itemByCode.set(p.code, p);
    }

    // Index districts
    for (const d of this.districts) {
      d.level = 'district';
      this.itemById.set(d.id, d);
      if (d.code) this.itemByCode.set(d.code, d);
      if (d.parentId) {
        const list = this.districtsByProvince.get(d.parentId) || [];
        list.push(d);
        this.districtsByProvince.set(d.parentId, list);
      }
    }

    // Index communes
    for (const c of this.communes) {
      c.level = 'commune';
      this.itemById.set(c.id, c);
      if (c.code) this.itemByCode.set(c.code, c);
      if (c.parentId) {
        const list = this.communesByDistrict.get(c.parentId) || [];
        list.push(c);
        this.communesByDistrict.set(c.parentId, list);
      }
    }

    // Index villages
    for (const v of this.villages) {
      v.level = 'village';
      this.itemById.set(v.id, v);
      if (v.code) this.itemByCode.set(v.code, v);
      if (v.parentId) {
        const list = this.villagesByCommune.get(v.parentId) || [];
        list.push(v);
        this.villagesByCommune.set(v.parentId, list);
      }
    }
  }

  // --- Read Operations ---

  public getProvinces(): AdminItem[] {
    return this.provinces;
  }

  public getDistrictsByProvinceId(provinceId: number): AdminItem[] {
    return this.districtsByProvince.get(provinceId) || [];
  }

  public getCommunesByDistrictId(districtId: number): AdminItem[] {
    return this.communesByDistrict.get(districtId) || [];
  }

  public getVillagesByCommuneId(communeId: number): AdminItem[] {
    return this.villagesByCommune.get(communeId) || [];
  }

  public getItemById(id: number): AdminItem | undefined {
    return this.itemById.get(id);
  }

  public getItemByCode(code: string): AdminItem | undefined {
    return this.itemByCode.get(code);
  }

  /**
   * Resolve full 4-tier hierarchy path given any node ID
   */
  public resolveHierarchy(id: number): HierarchyPath {
    const item = this.itemById.get(id);
    if (!item) return {};

    const path: HierarchyPath = {};
    let current: AdminItem | undefined = item;

    while (current) {
      if (current.level === 'village') path.village = current;
      else if (current.level === 'commune') path.commune = current;
      else if (current.level === 'district') path.district = current;
      else if (current.level === 'province') path.province = current;

      if (!current.parentId) break;
      current = this.itemById.get(current.parentId);
    }

    return path;
  }

  /**
   * Search across all administrative boundaries with Romanization & Khmer support
   */
  public search(query: string, level?: AdminLevel, limit = 20): AdminItem[] {
    const boundedLimit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const cleanQuery = AdminStore.normalize(query.slice(0, 100));
    if (!cleanQuery) return [];

    const pool = level
      ? (level === 'province'
          ? this.provinces
          : level === 'district'
            ? this.districts
            : level === 'commune'
              ? this.communes
              : this.villages)
      : [...this.provinces, ...this.districts, ...this.communes, ...this.villages];

    const results: { item: AdminItem; score: number }[] = [];

    for (const item of pool) {
      const normEn = AdminStore.normalize(item.name_en || '');
      const normKm = AdminStore.normalize(item.name_km || '');
      const normName = AdminStore.normalize(item.name || '');

      let score = -1;

      // Exact match
      if (normEn === cleanQuery || normKm === cleanQuery || normName === cleanQuery) {
        score = 100;
      }
      // Prefix match
      else if (normEn.startsWith(cleanQuery) || normKm.startsWith(cleanQuery)) {
        score = 80;
      }
      // Substring match
      else if (normEn.includes(cleanQuery) || normKm.includes(cleanQuery) || normName.includes(cleanQuery)) {
        score = 60;
      }

      if (score > 0) {
        results.push({ item, score });
      }
    }

    // Sort by relevance score descending, then alphabetically by name_en
    results.sort((a, b) => b.score - a.score || a.item.name_en.localeCompare(b.item.name_en));
    return results.slice(0, boundedLimit).map((r) => r.item);
  }

  public getStats(): AdminStats {
    return {
      provinces: this.provinces.length,
      districts: this.districts.length,
      communes: this.communes.length,
      villages: this.villages.length,
      total: this.provinces.length + this.districts.length + this.communes.length + this.villages.length,
      lastSyncAt: this.lastSyncAt,
    };
  }

  public getLastSyncAt(): string {
    return this.lastSyncAt || '2026-10-27T00:00:00.000Z';
  }

  /**
   * Update and persist freshly synced administrative data
   */
  public updateData(payload: {
    provinces: AdminItem[];
    districts: AdminItem[];
    communes: AdminItem[];
    villages: AdminItem[];
  }): void {
    this.provinces = payload.provinces;
    this.districts = payload.districts;
    this.communes = payload.communes;
    this.villages = payload.villages;
    this.lastSyncAt = new Date().toISOString();

    if (!currentDir || typeof fs?.writeFileSync !== 'function') {
      this.rebuildIndexes();
      return;
    }

    const syncDir = path.resolve(currentDir, 'synced');
    if (!fs.existsSync(syncDir)) {
      fs.mkdirSync(syncDir, { recursive: true });
    }

    fs.writeFileSync(path.join(syncDir, 'provinces.json'), JSON.stringify(this.provinces, null, 2));
    fs.writeFileSync(path.join(syncDir, 'districts.json'), JSON.stringify(this.districts, null, 2));
    fs.writeFileSync(path.join(syncDir, 'communes.json'), JSON.stringify(this.communes, null, 2));
    fs.writeFileSync(path.join(syncDir, 'villages.json'), JSON.stringify(this.villages, null, 2));
    fs.writeFileSync(path.join(syncDir, 'meta.json'), JSON.stringify({ lastSyncAt: this.lastSyncAt }, null, 2));

    this.rebuildIndexes();
  }
}
