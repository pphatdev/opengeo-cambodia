import type { MiddlewareHandler } from "hono";

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

        const cacheKey = new Request(c.req.url, {
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
        if (c.res && c.res.status === 200) {
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
