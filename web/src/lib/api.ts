/** Production origin, used in copy-paste snippets. Live requests go to the current origin. */
export const PROD_ORIGIN = "https://opengeo-cambodia.pphat.me";

export interface RequestLog {
    id: number;
    path: string;
    status: number;
    ms: number;
    server: string | null;
    remaining: string | null;
    size: number;
    body: unknown;
}

export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

let nextId = 1;

/**
 * Fetch JSON from the API, timing the round-trip and reporting it to `onLog`.
 * Throws ApiError for non-2xx responses (using the API's `error` message).
 */
export async function apiGet<T>(path: string, onLog?: (entry: RequestLog) => void, signal?: AbortSignal): Promise<T> {
    const t0 = performance.now();
    const res = await fetch(path, { headers: { Accept: "application/json" }, signal });
    const text = await res.text();
    const ms = performance.now() - t0;
    let body: unknown = null;
    try {
        body = JSON.parse(text);
    } catch {
        body = text;
    }
    onLog?.({
        id: nextId++,
        path,
        status: res.status,
        ms,
        server: res.headers.get("x-response-time"),
        remaining: res.headers.get("x-ratelimit-remaining"),
        size: new Blob([text]).size,
        body,
    });
    if (!res.ok) {
        const msg = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : `HTTP ${res.status}`;
        throw new ApiError(msg, res.status);
    }
    return body as T;
}

/** Remove internal fields (e.g. `_normEn`) and abbreviate coordinate arrays for display. */
export function forDisplay(body: unknown, opts: { abbreviateCoords?: boolean } = {}): unknown {
    return JSON.parse(
        JSON.stringify(body, (key, value) => {
            if (key.startsWith("_")) return undefined;
            if (opts.abbreviateCoords && key === "coordinates" && Array.isArray(value)) {
                return `[… ${JSON.stringify(value).length.toLocaleString()} bytes of coordinates]`;
            }
            return value;
        }),
    );
}

export const fmt = (n: number) => n.toLocaleString("en-US");
export const fmtBytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
