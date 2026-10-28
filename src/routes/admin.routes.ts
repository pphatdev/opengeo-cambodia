import { Hono } from "hono";
import { AdminService } from "../services/admin.service.js";
import { createEdgeCache } from "../middleware/edge-cache.js";
import { searchRateLimiter } from "../middleware/rate-limiter.js";
import type { ApiResponse } from "../types/api.js";
import type {
    AdminItem,
    AdminLevel,
    AdminStats,
    HierarchyPath,
} from "../types/admin.js";

export const adminRoutes = new Hono();
const adminService = new AdminService();

// Apply dedicated search rate limiter (120 req/min/IP) to prevent CPU resource exhaustion
adminRoutes.use("/search", searchRateLimiter);

const ALLOWED_LEVELS = new Set<string>([
    "province",
    "district",
    "commune",
    "village",
]);

/**
 * Validate and safely parse an administrative integer ID
 */
function parseValidId(param: string | undefined): number | null {
    if (!param || !/^\d{1,9}$/.test(param)) {
        return null;
    }
    const id = parseInt(param, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// 1. Cloudflare Workers Global Edge Cache (300+ edge PoPs, 1-year cache TTL)
adminRoutes.use("*", createEdgeCache({ cacheTtlSeconds: 31536000 }));

// 2. HTTP Caching Headers for ultra-fast local administrative responses
adminRoutes.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const tookMs = Number((performance.now() - start).toFixed(2));
    c.header("X-Response-Time", `${tookMs}ms`);
    c.header(
        "Cache-Control",
        "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400",
    );
});

// =========================================================================
// High-Throughput In-Memory Response Pre-Serialization Cache
// Bypasses repetitive JSON.stringify and GC allocation for static data
// =========================================================================
let cachedProvincesJson: string | null = null;
let cachedStatsJson: string | null = null;
const cachedDistrictsByProvinceJson = new Map<number, string>();
const cachedCommunesByDistrictJson = new Map<number, string>();
const cachedVillagesByCommuneJson = new Map<number, string>();
const cachedHierarchyJson = new Map<number, string>();
const cachedItemJson = new Map<number, string>();

/**
 * GET /api/admin/provinces
 * Returns all 25 provinces/capital of Cambodia (<0.05ms pre-serialized)
 */
adminRoutes.get("/provinces", (c) => {
    if (!cachedProvincesJson) {
        const provinces = adminService.getProvinces();
        const response: ApiResponse<AdminItem[]> = {
            success: true,
            data: provinces,
            meta: {
                total: provinces.length,
                timestamp: adminService.getLastSyncAt(),
                source: "local_cache",
            },
        };
        cachedProvincesJson = JSON.stringify(response);
    }

    return c.newResponse(cachedProvincesJson, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/admin/provinces/:id/districts
 * Returns all districts / khans / krongs within a province
 */
adminRoutes.get("/provinces/:id/districts", (c) => {
    const provinceId = parseValidId(c.req.param("id"));

    if (provinceId === null) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Invalid province ID format. Must be a positive integer.",
            },
            400,
        );
    }

    let json = cachedDistrictsByProvinceJson.get(provinceId);
    if (!json) {
        const districts = adminService.getDistricts(provinceId);
        const response: ApiResponse<AdminItem[]> = {
            success: true,
            data: districts,
            meta: {
                total: districts.length,
                timestamp: adminService.getLastSyncAt(),
                source: "local_cache",
            },
        };
        json = JSON.stringify(response);
        cachedDistrictsByProvinceJson.set(provinceId, json);
    }

    return c.newResponse(json, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/admin/districts/:id/communes
 * Returns all communes / sangkats within a district
 */
adminRoutes.get("/districts/:id/communes", (c) => {
    const districtId = parseValidId(c.req.param("id"));

    if (districtId === null) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Invalid district ID format. Must be a positive integer.",
            },
            400,
        );
    }

    let json = cachedCommunesByDistrictJson.get(districtId);
    if (!json) {
        const communes = adminService.getCommunes(districtId);
        const response: ApiResponse<AdminItem[]> = {
            success: true,
            data: communes,
            meta: {
                total: communes.length,
                timestamp: adminService.getLastSyncAt(),
                source: "local_cache",
            },
        };
        json = JSON.stringify(response);
        cachedCommunesByDistrictJson.set(districtId, json);
    }

    return c.newResponse(json, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/admin/communes/:id/villages
 * Returns all villages (phum) within a commune
 */
adminRoutes.get("/communes/:id/villages", (c) => {
    const communeId = parseValidId(c.req.param("id"));

    if (communeId === null) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Invalid commune ID format. Must be a positive integer.",
            },
            400,
        );
    }

    let json = cachedVillagesByCommuneJson.get(communeId);
    if (!json) {
        const villages = adminService.getVillages(communeId);
        const response: ApiResponse<AdminItem[]> = {
            success: true,
            data: villages,
            meta: {
                total: villages.length,
                timestamp: adminService.getLastSyncAt(),
                source: "local_cache",
            },
        };
        json = JSON.stringify(response);
        cachedVillagesByCommuneJson.set(communeId, json);
    }

    return c.newResponse(json, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/admin/item/:id
 * Lookup single item by ID
 */
adminRoutes.get("/item/:id", (c) => {
    const id = parseValidId(c.req.param("id"));
    if (id === null) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Invalid ID format. Must be a positive integer.",
            },
            400,
        );
    }

    let json = cachedItemJson.get(id);
    if (!json) {
        const item = adminService.getItemById(id);
        if (!item) {
            return c.json<ApiResponse<null>>({
                success: false,
                data: null,
                error: "Item not found",
            }, 404);
        }
        json = JSON.stringify({
            success: true,
            data: item,
        });
        cachedItemJson.set(id, json);
    }

    return c.newResponse(json, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/admin/hierarchy/:id
 * Resolves full ascending 4-tier tree (Province -> District -> Commune -> Village)
 */
adminRoutes.get("/hierarchy/:id", (c) => {
    const id = parseValidId(c.req.param("id"));
    if (id === null) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Invalid ID format. Must be a positive integer.",
            },
            400,
        );
    }

    let json = cachedHierarchyJson.get(id);
    if (!json) {
        const path = adminService.getHierarchy(id);
        json = JSON.stringify({
            success: true,
            data: path,
        });
        cachedHierarchyJson.set(id, json);
    }

    return c.newResponse(json, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/admin/search?q=...&level=...&limit=...
 * Search administrative divisions by Khmer or Romanized name
 */
adminRoutes.get("/search", (c) => {
    const rawQ = c.req.query("q") || "";
    const q = rawQ.trim();

    // Validate search length to mitigate ReDoS and CPU exhaustion
    if (q.length > 50) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Search query 'q' exceeds maximum length of 50 characters",
            },
            400,
        );
    }

    const rawLevel = c.req.query("level");
    let level: AdminLevel | undefined = undefined;
    if (rawLevel) {
        const normalizedLevel = rawLevel.toLowerCase();
        if (!ALLOWED_LEVELS.has(normalizedLevel)) {
            return c.json<ApiResponse<null>>(
                {
                    success: false,
                    data: null,
                    error: "Invalid 'level' parameter. Allowed values: province, district, commune, village",
                },
                400,
            );
        }
        level = normalizedLevel as AdminLevel;
    }

    const limitRaw = parseInt(c.req.query("limit") || "20", 10);
    const limit = Math.max(1, Math.min(100, isNaN(limitRaw) ? 20 : limitRaw));

    if (!q) {
        return c.json<ApiResponse<AdminItem[]>>({
            success: true,
            data: [],
            meta: { total: 0, tookMs: 0 },
        });
    }

    const results = adminService.search(q, level, limit);

    return c.json<ApiResponse<AdminItem[]>>({
        success: true,
        data: results,
        meta: {
            total: results.length,
            timestamp: adminService.getLastSyncAt(),
            source: "local_cache",
        },
    });
});

/**
 * GET /api/admin/stats
 * Summary statistics of administrative records (<0.05ms pre-serialized)
 */
adminRoutes.get("/stats", (c) => {
    if (!cachedStatsJson) {
        const stats = adminService.getStats();
        cachedStatsJson = JSON.stringify({
            success: true,
            data: stats,
        });
    }

    return c.newResponse(cachedStatsJson, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});
