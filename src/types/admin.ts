export type AdminLevel = 'province' | 'district' | 'commune' | 'village';

export interface AdminItem {
  id: number;          // OSM Relation/Node ID or NCDD Code
  name: string;        // Default name (usually Khmer or English)
  name_en: string;     // English romanized name (e.g., "Doun Penh")
  name_km: string;     // Khmer script name (e.g., "ខណ្ឌដូនពេញ")
  parentId?: number;   // ID of the parent boundary
  lat?: number;        // Centroid latitude
  lon?: number;        // Centroid longitude
  level?: AdminLevel;  // 4-tier category
  code?: string;       // Official NCDD administrative code (e.g., "12", "1201", "120101")
  typeKm?: string;     // e.g. "រាជធានី", "ខេត្ត", "ខណ្ឌ", "ស្រុក", "ក្រុង", "សង្កាត់", "ឃុំ", "ភូមិ"
}

export interface AdminStats {
  provinces: number;
  districts: number;
  communes: number;
  villages: number;
  total: number;
  lastSyncAt: string | null;
}

export interface BreadcrumbItem {
  level: AdminLevel;
  id: number;
  name: string;
  name_en: string;
  name_km: string;
}

export interface HierarchyPath {
  province?: AdminItem;
  district?: AdminItem;
  commune?: AdminItem;
  village?: AdminItem;
}
