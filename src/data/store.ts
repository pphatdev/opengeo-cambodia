import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AdminItem, AdminLevel, AdminStats, HierarchyPath } from '../types/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  public loadData(): void {
    const csvPath = path.resolve(__dirname, 'CambodiaGeographicalList.csv');
    const syncDir = path.resolve(__dirname, 'synced');
    const seedDir = path.resolve(__dirname, 'seed');

    // Load centroid coordinates map for provinces
    const provinceCoords = this.loadProvinceCoords(seedDir);

    // If official CSV dataset exists, parse full nationwide 4-tier geography
    if (fs.existsSync(csvPath)) {
      try {
        const loadedFromCsv = this.loadFromCsv(csvPath, provinceCoords);
        if (loadedFromCsv) {
          this.rebuildIndexes();
          this.isLoaded = true;
          return;
        }
      } catch (err) {
        console.warn('[AdminStore] Error reading CSV, falling back to JSON seed:', err);
      }
    }

    // Fallback: prefer synced directory if available, else seed directory
    const activeDir =
      fs.existsSync(syncDir) && fs.existsSync(path.join(syncDir, 'provinces.json'))
        ? syncDir
        : seedDir;

    try {
      this.provinces = this.readJsonFile<AdminItem[]>(path.join(activeDir, 'provinces.json'), []);
      this.districts = this.readJsonFile<AdminItem[]>(path.join(activeDir, 'districts.json'), []);
      this.communes = this.readJsonFile<AdminItem[]>(path.join(activeDir, 'communes.json'), []);
      this.villages = this.readJsonFile<AdminItem[]>(path.join(activeDir, 'villages.json'), []);

      const metaFile = path.join(activeDir, 'meta.json');
      if (fs.existsSync(metaFile)) {
        const meta = this.readJsonFile<{ lastSyncAt: string }>(metaFile, { lastSyncAt: '' });
        this.lastSyncAt = meta.lastSyncAt || null;
      }

      this.rebuildIndexes();
      this.isLoaded = true;
    } catch (err) {
      console.error('[AdminStore] Error loading data:', err);
    }
  }

  private loadProvinceCoords(seedDir: string): Map<string, { lat: number; lon: number; typeKm?: string }> {
    const coordsMap = new Map<string, { lat: number; lon: number; typeKm?: string }>();
    const seedProvincesPath = path.join(seedDir, 'provinces.json');
    if (fs.existsSync(seedProvincesPath)) {
      try {
        const list = JSON.parse(fs.readFileSync(seedProvincesPath, 'utf-8')) as AdminItem[];
        for (const p of list) {
          if (p.code && p.lat && p.lon) {
            coordsMap.set(p.code, { lat: p.lat, lon: p.lon, typeKm: p.typeKm });
          }
        }
      } catch {
        // ignore
      }
    }
    // Fallback to official Cambodian provincial centroid coordinates
    for (const [code, coord] of Object.entries(DEFAULT_PROVINCE_COORDINATES)) {
      if (!coordsMap.has(code)) {
        coordsMap.set(code, coord);
      }
    }
    return coordsMap;
  }

  /**
   * Parse the complete nationwide Cambodian Geographical List CSV (14,500+ records)
   */
  private loadFromCsv(
    csvPath: string,
    provinceCoords: Map<string, { lat: number; lon: number; typeKm?: string }>
  ): boolean {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);

    if (lines.length < 2) return false;

    const provinceMap = new Map<string, AdminItem>();
    const districtMap = new Map<string, AdminItem>();
    const communeMap = new Map<string, AdminItem>();
    const villageMap = new Map<string, AdminItem>();

    // Load commune overrides from CambodiaCommuneList.csv if present
    const communeCsvPath = path.resolve(__dirname, 'CambodiaCommuneList.csv');
    const communeOverrides = new Map<string, { kh: string; en: string }>();
    if (fs.existsSync(communeCsvPath)) {
      const cContent = fs.readFileSync(communeCsvPath, 'utf-8');
      const cLines = cContent.split(/\r?\n/);
      for (let i = 1; i < cLines.length; i++) {
        const cLine = cLines[i].trim();
        if (!cLine) continue;
        const cParts = cLine.split(',');
        if (cParts.length >= 5 && cParts[2]) {
          communeOverrides.set(cParts[2].trim(), {
            kh: cParts[3].trim(),
            en: cParts[4].trim(),
          });
        }
      }
    }

    // Load district overrides from CambodiaDistrictList.csv if present
    const districtCsvPath = path.resolve(__dirname, 'CambodiaDistrictList.csv');
    const districtOverrides = new Map<string, { kh: string; en: string }>();
    if (fs.existsSync(districtCsvPath)) {
      const dContent = fs.readFileSync(districtCsvPath, 'utf-8');
      const dLines = dContent.split(/\r?\n/);
      for (let i = 1; i < dLines.length; i++) {
        const dLine = dLines[i].trim();
        if (!dLine) continue;
        const dParts = dLine.split(',');
        if (dParts.length >= 4 && dParts[1]) {
          districtOverrides.set(dParts[1].trim(), {
            kh: dParts[2].trim(),
            en: dParts[3].trim(),
          });
        }
      }
    }

    // Load province overrides from CambodiaProvinceList.csv if present
    const provinceCsvPath = path.resolve(__dirname, 'CambodiaProvinceList.csv');
    const provinceOverrides = new Map<string, { kh: string; en: string }>();
    if (fs.existsSync(provinceCsvPath)) {
      const pContent = fs.readFileSync(provinceCsvPath, 'utf-8');
      const pLines = pContent.split(/\r?\n/);
      for (let i = 1; i < pLines.length; i++) {
        const pLine = pLines[i].trim();
        if (!pLine) continue;
        const pParts = pLine.split(',');
        if (pParts.length >= 3 && pParts[0]) {
          provinceOverrides.set(pParts[0].trim(), {
            kh: pParts[1].trim(),
            en: pParts[2].trim(),
          });
        }
      }
    }

    // Load village overrides from CambodiaVillagesList.csv if present
    const villageCsvPath = path.resolve(__dirname, 'CambodiaVillagesList.csv');
    const villageOverrides = new Map<string, { kh: string; en: string }>();
    if (fs.existsSync(villageCsvPath)) {
      const vContent = fs.readFileSync(villageCsvPath, 'utf-8');
      const vLines = vContent.split(/\r?\n/);
      for (let i = 1; i < vLines.length; i++) {
        const vLine = vLines[i].trim();
        if (!vLine) continue;
        const vParts = vLine.split(',');
        if (vParts.length >= 6 && vParts[3]) {
          villageOverrides.set(vParts[3].trim(), {
            kh: vParts[4].trim(),
            en: vParts[5].trim(),
          });
        }
      }
    }

    // Header: province_code,province_kh,province_en,district_code,district_kh,district_en,commune_code,commune_kh,commune_en,village_code,village_kh,village_en
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

      // Province
      if (!provinceMap.has(pCode)) {
        const coords = provinceCoords.get(pCode);
        const override = provinceOverrides.get(pCode);
        const finalEn = override?.en || pEn;
        const finalKh = override?.kh || pKh;
        provinceMap.set(pCode, {
          id: pId,
          code: pCode,
          name: finalEn,
          name_en: finalEn,
          name_km: finalKh,
          level: 'province',
          lat: coords?.lat,
          lon: coords?.lon,
          typeKm: coords?.typeKm || (pCode === '12' ? 'រាជធានី' : 'ខេត្ត'),
        });
      }

      // District
      const isKhan = pCode === '12';
      const isKrong = KRONG_CODES.has(dCode) || dEn.toLowerCase().startsWith('krong ') || dKh.startsWith('ក្រុង');

      if (!districtMap.has(dCode)) {
        const override = districtOverrides.get(dCode);
        const finalEn = override?.en || dEn;
        const finalKh = override?.kh || dKh;
        districtMap.set(dCode, {
          id: dId,
          code: dCode,
          parentId: pId,
          name: finalEn,
          name_en: finalEn,
          name_km: finalKh,
          level: 'district',
          typeKm: isKhan ? 'ខណ្ឌ' : isKrong ? 'ក្រុង' : 'ស្រុក',
        });
      }

      // Commune
      if (!communeMap.has(cCode)) {
        const isSangkat = isKhan || isKrong;
        const override = communeOverrides.get(cCode);
        const finalEn = override?.en || cEn;
        const finalKh = override?.kh || cKh;
        communeMap.set(cCode, {
          id: cId,
          code: cCode,
          parentId: dId,
          name: finalEn,
          name_en: finalEn,
          name_km: finalKh,
          level: 'commune',
          typeKm: isSangkat ? 'សង្កាត់' : 'ឃុំ',
        });
      }

      // Village
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
        const override = villageOverrides.get(resolvedVCode) || villageOverrides.get(vCode);
        const finalEn = override?.en || vEn;
        const finalKh = override?.kh || vKh;
        villageMap.set(resolvedVCode, {
          id: resolvedVId,
          code: resolvedVCode,
          parentId: cId,
          name: finalEn,
          name_en: finalEn,
          name_km: finalKh,
          level: 'village',
          typeKm: 'ភូមិ',
        });
      }
    }

    this.provinces = Array.from(provinceMap.values()).sort((a, b) => a.id - b.id);
    this.districts = Array.from(districtMap.values()).sort((a, b) => a.id - b.id);
    this.communes = Array.from(communeMap.values()).sort((a, b) => a.id - b.id);
    this.villages = Array.from(villageMap.values()).sort((a, b) => a.id - b.id);
    this.lastSyncAt = new Date().toISOString();

    // Automatically persist synchronized seed files
    const seedDir = path.resolve(__dirname, 'seed');
    try {
      if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });
      fs.writeFileSync(path.join(seedDir, 'provinces.json'), JSON.stringify(this.provinces, null, 2), 'utf-8');
      fs.writeFileSync(path.join(seedDir, 'districts.json'), JSON.stringify(this.districts, null, 2), 'utf-8');
      fs.writeFileSync(path.join(seedDir, 'communes.json'), JSON.stringify(this.communes, null, 2), 'utf-8');
      fs.writeFileSync(path.join(seedDir, 'villages.json'), JSON.stringify(this.villages, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[AdminStore] Could not write seed files:', err);
    }

    return true;
  }

  private readJsonFile<T>(filePath: string, fallback: T): T {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
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
    const cleanQuery = AdminStore.normalize(query);
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
    return results.slice(0, limit).map((r) => r.item);
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

  /**
   * Update and persist freshly synced administrative data
   */
  public updateData(payload: {
    provinces: AdminItem[];
    districts: AdminItem[];
    communes: AdminItem[];
    villages: AdminItem[];
  }): void {
    const syncDir = path.resolve(__dirname, 'synced');
    if (!fs.existsSync(syncDir)) {
      fs.mkdirSync(syncDir, { recursive: true });
    }

    this.provinces = payload.provinces;
    this.districts = payload.districts;
    this.communes = payload.communes;
    this.villages = payload.villages;
    this.lastSyncAt = new Date().toISOString();

    fs.writeFileSync(path.join(syncDir, 'provinces.json'), JSON.stringify(this.provinces, null, 2));
    fs.writeFileSync(path.join(syncDir, 'districts.json'), JSON.stringify(this.districts, null, 2));
    fs.writeFileSync(path.join(syncDir, 'communes.json'), JSON.stringify(this.communes, null, 2));
    fs.writeFileSync(path.join(syncDir, 'villages.json'), JSON.stringify(this.villages, null, 2));
    fs.writeFileSync(path.join(syncDir, 'meta.json'), JSON.stringify({ lastSyncAt: this.lastSyncAt }, null, 2));

    this.rebuildIndexes();
  }
}
