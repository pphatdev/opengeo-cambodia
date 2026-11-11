import type { MiddlewareHandler } from "hono";

/**
 * Bump to invalidate every cached entry when no per-deploy version id is available.
 * On Cloudflare, the CF_VERSION_METADATA binding id is used, so each deploy gets a fresh cache.
 */
const CACHE_SCHEMA_VERSION = "2";

/**
 * Query parameters that change the response of /api/boundaries/* routes.
 * Anything else is dropped from the cache key (anti cache-busting).
 */
const BOUNDARY_QUERY_PARAMS = [
    "level",
    "province_code",
    "provincecode",
    "district_code",
    "districtcode",
    "code",
    "q",
    "search",
    "format",
    "limit",
    "offset",
    "lat",
    "latitude",
    "lng",
    "lon",
    "longitude",
];

/**
 * Normalizes request URL into a deterministic cache key.
 * Strips arbitrary cache-busting junk query parameters to defeat Cache Busting DoS attacks.
 */
function normalizeCacheUrl(rawUrl: string, version: string): string {
    try {
        const u = new URL(rawUrl);
        u.protocol = "https:";

        if (u.pathname.startsWith("/api/boundaries")) {
            // Boundaries responses depend on filters, format and coordinates: keep only known params
            const cleanParams = new URLSearchParams();
            for (const [rawKey, rawVal] of u.searchParams) {
                const key = rawKey.toLowerCase();
                const val = rawVal.trim();
                if (!BOUNDARY_QUERY_PARAMS.includes(key) || val === "" || cleanParams.has(key)) continue;
                cleanParams.set(key, key === "q" || key === "search" ? val.toLowerCase() : val);
            }
            cleanParams.sort();
            u.search = cleanParams.toString();
        } else if (u.pathname.endsWith("/search")) {
            // For search route, only preserve whitelisted parameters
            const cleanParams = new URLSearchParams();
            const allowed = ["q", "level", "limit"];
            for (const key of allowed) {
                const val = u.searchParams.get(key);
                if (val !== null && val.trim() !== "") {
                    cleanParams.set(key, val.trim().toLowerCase());
                }
            }
            cleanParams.sort();
            u.search = cleanParams.toString();
        } else if (u.pathname.includes("/geocode/reverse")) {
            // Round coordinates to 4 decimal places (~11m precision) to maximize edge cache reuse
            const cleanParams = new URLSearchParams();
            const lat = parseFloat(u.searchParams.get("lat") || "");
            const lon = parseFloat(u.searchParams.get("lon") || "");
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                cleanParams.set("lat", lat.toFixed(4));
                cleanParams.set("lon", lon.toFixed(4));
            }
            u.search = cleanParams.toString();
        } else {
            // Purely static/immutable routes (/provinces, /districts, /communes, /villages, /item/:id, /hierarchy/:id, /stats)
            // Completely strip all query parameters so cache-busting attempts hit edge cache
            u.search = "";
        }

        // Namespace the key by deploy version so a new deploy never serves responses from an old one
        u.searchParams.set("__v", version);

        return u.toString();
    } catch {
        return rawUrl;
    }
}

/**
 * Cloudflare Workers Edge Cache Middleware
 *
 * Utilizes Cloudflare's native Cache API (`caches.default`) to serve immutable
 * Cambodia administrative geography responses directly from Cloudflare's 300+
 * global edge PoPs with sub-1ms response times, zero origin load, and no rate limit exhaustion.
 */
export function createEdgeCache(options?: {
    cacheTtlSeconds?: number;
}): MiddlewareHandler {
    const ttl = options?.cacheTtlSeconds || 31536000; // Default: 1 year for immutable geographic data

    return async (c, next) => {
        // Only cache safe GET and HEAD requests
        if (c.req.method !== "GET" && c.req.method !== "HEAD") {
            return next();
        }

        // Check if running in a Cloudflare Workers environment with Cache API
        let edgeCache: any = null;
        try {
            const cacheStorage = (globalThis as unknown as { caches?: { default?: any } })?.caches;
            if (cacheStorage?.default) {
                edgeCache = cacheStorage.default;
            }
        } catch {
            // Not in Cloudflare Workers environment (e.g. Node.js local dev)
        }

        if (!edgeCache) {
            return next();
        }

        const deployVersion = (c.env as { CF_VERSION_METADATA?: { id?: string } } | undefined)
            ?.CF_VERSION_METADATA?.id;
        const version = deployVersion ? `${CACHE_SCHEMA_VERSION}-${deployVersion}` : CACHE_SCHEMA_VERSION;
        const normalizedUrl = normalizeCacheUrl(c.req.url, version);
        const cacheKey = new Request(normalizedUrl, {
            method: "GET",
        });

        // 1. Check Cloudflare Edge Cache
        try {
            const cachedResponse = await edgeCache.match(cacheKey);
            if (cachedResponse) {
                const hitRes = new Response(cachedResponse.body, cachedResponse);
                hitRes.headers.set("X-Cache", "HIT-CLOUDFLARE-EDGE");
                hitRes.headers.set("CF-Cache-Status", "HIT");
                return hitRes;
            }
        } catch {
            // Fall through to origin if cache lookup fails
        }

        // 2. Cache Miss: Execute downstream handler
        await next();

        // 3. Store successful 200 responses in Cloudflare Edge Cache
        // Handlers opt out (e.g. dataset not loaded yet) with Cache-Control: no-store
        const resCacheControl = c.res?.headers.get("Cache-Control") || "";
        if (c.res && c.res.status === 200 && !/no-store/i.test(resCacheControl)) {
            try {
                const responseToCache = c.res.clone();

                if (!responseToCache.headers.has("Cache-Control")) {
                    responseToCache.headers.set(
                        "Cache-Control",
                        `public, max-age=${ttl}, s-maxage=${ttl}, immutable`,
                    );
                }

                // Cloudflare Workers executionCtx.waitUntil keeps worker alive to store in cache asynchronously
                if (c.executionCtx && typeof (c.executionCtx as any).waitUntil === "function") {
                    (c.executionCtx as any).waitUntil(edgeCache.put(cacheKey, responseToCache));
                } else {
                    await edgeCache.put(cacheKey, responseToCache);
                }
            } catch {
                // Ignore background caching errors
            }
        }
    };
}
