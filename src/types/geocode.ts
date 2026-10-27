export interface AdminHierarchy {
    province: string | null; // e.g. "Phnom Penh"
    district: string | null; // e.g. "Doun Penh"
    commune: string | null; // e.g. "Phsar Thmei 1"
    village: string | null; // e.g. "Phum 1"
    country: "Cambodia";
}

export interface GeocodeResult {
    displayName: string;
    lat: number;
    lon: number;
    hierarchy: AdminHierarchy;
    osmId?: number;
    osmType?: string;
    type?: string;
    importance?: number;
    rawAddress?: Record<string, string>;
}

export interface NominatimRawItem {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    type?: string;
    importance?: number;
    address?: Record<string, string>;
    boundingbox?: string[];
}
