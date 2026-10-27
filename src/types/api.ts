export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        total?: number;
        tookMs?: number;
        timestamp?: string;
        source?: "local_cache" | "nominatim" | "overpass";
    };
    error?: string;
    message?: string;
}
