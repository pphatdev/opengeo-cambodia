export type BoundaryLevel = "province" | "district" | "commune";

export interface GeoJsonGeometry {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
}

export interface BoundaryProperties {
    id: number;
    code: string; // NCDD code: "12", "0205", "110202"
    pcode: string; // PCODE: "KH12", "KH0205", "KH110202"
    name: string; // Default name (English)
    name_en: string; // Romanized name e.g. "Phnom Penh", "Doun Penh"
    name_km: string; // Khmer script name e.g. "រាជធានីភ្នំពេញ", "ខណ្ឌដូនពេញ"
    type_km: string; // e.g. "រាជធានី", "ខេត្ត", "ខណ្ឌ", "ស្រុក", "ក្រុង", "ឃុំ", "សង្កាត់"
    level: BoundaryLevel;
    province_code?: string;
    province_name_en?: string;
    province_name_km?: string;
    district_code?: string;
    district_name_en?: string;
    district_name_km?: string;
    lat?: number; // Centroid latitude
    lon?: number; // Centroid longitude
    bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
    shape_length?: number;
    shape_area?: number;
    date?: string;
    validOn?: string;
    [key: string]: any;
}

export interface BoundaryFeature {
    type: "Feature";
    id?: string | number;
    properties: BoundaryProperties;
    geometry: GeoJsonGeometry;
    bbox?: [number, number, number, number];
}

/** One boundary in a points-per-boundary count (see BoundariesService.countByPoints) */
export interface CountGroup {
    /** "<level>:<code>", unique within one count */
    key: string;
    /** Key of the group one tier up this point was resolved through (level=all only) */
    parent?: string;
    level: BoundaryLevel;
    feature: BoundaryFeature;
    count: number;
    /** First input point that fell in this boundary */
    point: { lat: number; lng: number };
}

export interface BoundaryFeatureCollection {
    type: "FeatureCollection";
    name?: string;
    crs?: {
        type: string;
        properties: { name: string };
    };
    bbox?: [number, number, number, number];
    features: BoundaryFeature[];
}

export interface BoundarySummaryItem {
    id: number;
    code: string;
    pcode: string;
    name: string;
    name_en: string;
    name_km: string;
    type_km: string;
    level: BoundaryLevel;
    province_code?: string;
    province_name_en?: string;
    province_name_km?: string;
    district_code?: string;
    district_name_en?: string;
    district_name_km?: string;
    lat?: number;
    lon?: number;
    bbox: [number, number, number, number];
    shape_length?: number;
    shape_area?: number;
}

export interface BoundaryFilterOptions {
    level?: BoundaryLevel;
    provinceCode?: string;
    districtCode?: string;
    code?: string;
    search?: string;
    lat?: number;
    lon?: number;
    limit?: number;
    offset?: number;
    format?: "geojson" | "summary" | "list";
}

export interface BoundaryPointLookupOptions {
    lat: number;
    lon: number;
    level?: BoundaryLevel | "all";
    format?: "geojson" | "summary" | "json" | "list";
}

export interface BoundaryZoneResult {
    matched: boolean;
    point: {
        lat: number;
        lng: number;
    };
    province?: BoundarySummaryItem | BoundaryFeature;
    district?: BoundarySummaryItem | BoundaryFeature;
    commune?: BoundarySummaryItem | BoundaryFeature;
    boundaries?: BoundaryFeatureCollection;
    geoJson?: BoundaryFeature | BoundaryFeatureCollection;
}

export interface BoundaryStats {
    provinces: number;
    districts: number;
    communes: number;
    total: number;
    levels: BoundaryLevel[];
    bbox: [number, number, number, number];
    isLoaded: boolean;
    source: string;
}
