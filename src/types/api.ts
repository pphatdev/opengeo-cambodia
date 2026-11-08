export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        total?: number;
        tookMs?: number;
        timestamp?: string;
        source?: "local_cache" | "nominatim" | "overpass" | "spatial_index";
        point?: { lat: number; lng: number };
        [key: string]: any;
    };
    error?: string;
    message?: string;
}
