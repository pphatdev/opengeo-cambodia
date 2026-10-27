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
   * Load administrative boundaries strictly from canonical JSON seed datasets.
   * Read-only: never modifies, overwrites, or regenerates seed files on server startup.
   */
  public loadData(): void {
    const possibleDataDirs = [
      path.resolve(__dirname),
      path.resolve(__dirname, '..', '..', 'src', 'data'),
      path.resolve(process.cwd(), 'dist', 'data'),
      path.resolve(process.cwd(), 'src', 'data'),
    ];

    let dataDir = path.resolve(__dirname);
    for (const candidate of possibleDataDirs) {
      if (fs.existsSync(path.join(candidate, 'seed', 'provinces.json'))) {
        dataDir = candidate;
        break;
      }
    }

    const syncDir = path.resolve(dataDir, 'synced');
    const seedDir = path.resolve(dataDir, 'seed');

    // Prefer synced directory if present and valid, otherwise strictly load from canonical seed directory
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
      console.error('[AdminStore] Error loading data from seed:', err);
    }
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
