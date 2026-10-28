import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { BoundariesService } from "../services/boundaries.service.js";
import { createEdgeCache } from "../middleware/edge-cache.js";
import type { ApiResponse } from "../types/api.js";
import type {
    BoundaryLevel,
    BoundaryStats,
    BoundarySummaryItem,
} from "../types/boundaries.js";

export const boundariesRoutes = new Hono();
const boundariesService = BoundariesService.getInstance();

function resolveCurrentDir(): string {
    try {
        if (typeof import.meta !== "undefined" && import.meta && import.meta.url) {
            return path.dirname(fileURLToPath(import.meta.url));
        }
    } catch {
        // Edge / Cloudflare Workers runtime
    }
    return "";
}

const currentDir = resolveCurrentDir();

const ALLOWED_LEVELS = new Set<string>(["province", "district", "commune"]);

// 1. Cloudflare Workers Global Edge Cache (300+ Edge PoPs, 1-year cache TTL)
boundariesRoutes.use("*", createEdgeCache({ cacheTtlSeconds: 31536000 }));

// 2. HTTP Caching Headers for ultra-fast boundary responses
boundariesRoutes.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const tookMs = Number((performance.now() - start).toFixed(2));
    c.header("X-Response-Time", `${tookMs}ms`);
    c.header(
        "Cache-Control",
        "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400",
    );
});

/**
 * GET /api/boundaries
 * Flexible Boundaries API with spatial filtering, search, pagination, and format selection
 *
 * Query Parameters:
 * - level: 'province' | 'district' | 'commune' (default: 'province')
 * - province_code / provinceCode: filter by parent province code (e.g., '12' or 'KH12')
 * - district_code / districtCode: filter by parent district code (e.g., '1201' or 'KH1201')
 * - code: exact code match (e.g. '12', '1201', '120101')
 * - q / search: text search matching English or Khmer names
 * - format: 'geojson' (default, GeoJSON FeatureCollection) | 'summary' / 'list' (lightweight JSON list without heavy coordinates)
 * - limit: number of records to return
 * - offset: pagination offset
 */
boundariesRoutes.get("/", (c) => {
    const rawLevel = (c.req.query("level") || "").toLowerCase();
    const level = ALLOWED_LEVELS.has(rawLevel) ? (rawLevel as BoundaryLevel) : undefined;

    const provinceCode = c.req.query("province_code") || c.req.query("provinceCode");
    const districtCode = c.req.query("district_code") || c.req.query("districtCode");
    const code = c.req.query("code");
    const search = c.req.query("q") || c.req.query("search");
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";

    const rawLimit = c.req.query("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
    const rawOffset = c.req.query("offset");
    const offset = rawOffset ? parseInt(rawOffset, 10) : undefined;

    // Fast cache lookup for default provinces query
    const isDefaultProvinces = !level || (level === "province" && !provinceCode && !districtCode && !code && !search && !limit && !offset);
    if (isDefaultProvinces) {
        const cacheKey = `default_provinces_${format}`;
        const cached = boundariesService.getPreSerialized(cacheKey);
        if (cached) {
            return c.newResponse(cached, 200, {
                "Content-Type": format === "geojson" ? "application/geo+json; charset=utf-8" : "application/json; charset=utf-8",
            });
        }
    }

    const result = boundariesService.getBoundaries({
        level,
        provinceCode,
        districtCode,
        code,
        search,
        format,
        limit,
        offset,
    });

    if (result.isGeoJson) {
        const jsonStr = JSON.stringify(result.data);
        if (isDefaultProvinces) {
            boundariesService.setPreSerialized(`default_provinces_${format}`, jsonStr);
        }
        return c.newResponse(jsonStr, 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    const response: ApiResponse<BoundarySummaryItem[]> = {
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: {
            total: result.total,
            source: "local_cache",
        },
    };
    const jsonStr = JSON.stringify(response);
    if (isDefaultProvinces) {
        boundariesService.setPreSerialized(`default_provinces_${format}`, jsonStr);
    }
    return c.newResponse(jsonStr, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/provinces
 * Shortcut for all 25 province boundaries
 */
boundariesRoutes.get("/provinces", (c) => {
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";
    const search = c.req.query("q") || c.req.query("search");
    const code = c.req.query("code");

    if (!search && !code) {
        const cacheKey = `provinces_all_${format}`;
        const cached = boundariesService.getPreSerialized(cacheKey);
        if (cached) {
            return c.newResponse(cached, 200, {
                "Content-Type": format === "geojson" ? "application/geo+json; charset=utf-8" : "application/json; charset=utf-8",
            });
        }
    }

    const result = boundariesService.getBoundaries({
        level: "province",
        code,
        search,
        format,
    });

    if (result.isGeoJson) {
        const jsonStr = JSON.stringify(result.data);
        if (!search && !code) {
            boundariesService.setPreSerialized(`provinces_all_${format}`, jsonStr);
        }
        return c.newResponse(jsonStr, 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    const response: ApiResponse<BoundarySummaryItem[]> = {
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: {
            total: result.total,
            source: "local_cache",
        },
    };
    const jsonStr = JSON.stringify(response);
    if (!search && !code) {
        boundariesService.setPreSerialized(`provinces_all_${format}`, jsonStr);
    }
    return c.newResponse(jsonStr, 200, {
        "Content-Type": "application/json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/provinces/:code
 * Get boundary of a single province by code or PCODE (e.g. '12' or 'KH12')
 */
boundariesRoutes.get("/provinces/:code", (c) => {
    const rawCode = c.req.param("code");
    const feature = boundariesService.getBoundaryByCode(rawCode, "province");

    if (!feature) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `Province boundary not found for code '${rawCode}'`,
            },
            404,
        );
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(rawCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({
            success: true,
            data: summary || (feature.properties as any),
        });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/districts
 * Shortcut for district boundaries (filterable by province_code)
 */
boundariesRoutes.get("/districts", (c) => {
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";
    const provinceCode = c.req.query("province_code") || c.req.query("provinceCode");
    const search = c.req.query("q") || c.req.query("search");
    const code = c.req.query("code");

    const rawLimit = c.req.query("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
    const rawOffset = c.req.query("offset");
    const offset = rawOffset ? parseInt(rawOffset, 10) : undefined;

    const result = boundariesService.getBoundaries({
        level: "district",
        provinceCode,
        code,
        search,
        format,
        limit,
        offset,
    });

    if (result.isGeoJson) {
        return c.newResponse(JSON.stringify(result.data), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    return c.json<ApiResponse<BoundarySummaryItem[]>>({
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: {
            total: result.total,
            source: "local_cache",
        },
    });
});

/**
 * GET /api/boundaries/districts/:code
 * Get boundary of a single district by code (e.g. '1201' or 'KH1201')
 */
boundariesRoutes.get("/districts/:code", (c) => {
    const rawCode = c.req.param("code");
    const feature = boundariesService.getBoundaryByCode(rawCode, "district");

    if (!feature) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `District boundary not found for code '${rawCode}'`,
            },
            404,
        );
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(rawCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({
            success: true,
            data: summary || (feature.properties as any),
        });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/communes
 * Shortcut for commune boundaries (filterable by district_code or province_code)
 */
boundariesRoutes.get("/communes", (c) => {
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";
    const districtCode = c.req.query("district_code") || c.req.query("districtCode");
    const provinceCode = c.req.query("province_code") || c.req.query("provinceCode");
    const search = c.req.query("q") || c.req.query("search");
    const code = c.req.query("code");

    const rawLimit = c.req.query("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
    const rawOffset = c.req.query("offset");
    const offset = rawOffset ? parseInt(rawOffset, 10) : undefined;

    const result = boundariesService.getBoundaries({
        level: "commune",
        districtCode,
        provinceCode,
        code,
        search,
        format,
        limit,
        offset,
    });

    if (result.isGeoJson) {
        return c.newResponse(JSON.stringify(result.data), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    return c.json<ApiResponse<BoundarySummaryItem[]>>({
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: {
            total: result.total,
            source: "local_cache",
        },
    });
});

/**
 * GET /api/boundaries/communes/:code
 * Get boundary of a single commune by code (e.g. '120101' or 'KH120101')
 */
boundariesRoutes.get("/communes/:code", (c) => {
    const rawCode = c.req.param("code");
    const feature = boundariesService.getBoundaryByCode(rawCode, "commune");

    if (!feature) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `Commune boundary not found for code '${rawCode}'`,
            },
            404,
        );
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(rawCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({
            success: true,
            data: summary || (feature.properties as any),
        });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/stats
 * Statistics of available boundaries
 */
boundariesRoutes.get("/stats", (c) => {
    const stats: BoundaryStats = boundariesService.getStats();
    return c.json<ApiResponse<BoundaryStats>>({
        success: true,
        data: stats,
    });
});

/**
 * GET /api/boundaries/hierarchy/:code
 * Resolves ascending boundary hierarchy (e.g. Commune -> District -> Province)
 */
boundariesRoutes.get("/hierarchy/:code", (c) => {
    const rawCode = c.req.param("code");
    const hierarchy = boundariesService.getHierarchy(rawCode);

    if (!hierarchy.province && !hierarchy.district && !hierarchy.commune) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `Boundary hierarchy not found for code '${rawCode}'`,
            },
            404,
        );
    }

    return c.json({
        success: true,
        data: hierarchy,
    });
});

/**
 * GET /api/boundaries/item/:code
 * Single boundary lookup by code (auto-detects level)
 */
boundariesRoutes.get("/item/:code", (c) => {
    const rawCode = c.req.param("code");
    const feature = boundariesService.getBoundaryByCode(rawCode);

    if (!feature) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `Boundary not found for code '${rawCode}'`,
            },
            404,
        );
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(rawCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({
            success: true,
            data: summary || (feature.properties as any),
        });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/raw/:filename
 * Direct raw GeoJSON dataset download
 */
boundariesRoutes.get("/raw/:filename", (c) => {
    const filename = c.req.param("filename").toLowerCase();
    const allowedFiles: Record<string, string> = {
        "provinces.geojson": "province.geojson",
        "province.geojson": "province.geojson",
        "districts.geojson": "district.geojson",
        "district.geojson": "district.geojson",
        "communes.geojson": "commune.geojson",
        "commune.geojson": "commune.geojson",
    };

    const targetFile = allowedFiles[filename];
    if (!targetFile) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: "Invalid boundary filename. Allowed: provinces.geojson, districts.geojson, communes.geojson",
            },
            404,
        );
    }

    const candidates = [
        path.resolve(currentDir, "..", "data", "boundaries", targetFile),
        path.resolve(currentDir, "boundaries", targetFile),
        path.resolve(process.cwd(), "src", "data", "boundaries", targetFile),
        path.resolve(process.cwd(), "dist", "data", "boundaries", targetFile),
        path.resolve(process.cwd(), "public", "boundaries", targetFile),
    ];

    for (const filePath of candidates) {
        if (typeof fs?.existsSync === "function" && fs.existsSync(filePath)) {
            c.header("Content-Type", "application/geo+json; charset=utf-8");
            c.header("Content-Disposition", `attachment; filename="${filename}"`);
            c.header("Cache-Control", "public, max-age=31536000, immutable");
            return c.body(fs.readFileSync(filePath, "utf-8"));
        }
    }

    return c.json<ApiResponse<null>>(
        {
            success: false,
            data: null,
            error: "Boundary file not found on disk",
        },
        404,
    );
});

/**
 * GET /api/boundaries/:code
 * Shortcut for single boundary lookup by code (e.g. '12', 'KH12', '1201', '120101')
 */
boundariesRoutes.get("/:code", (c) => {
    const rawCode = c.req.param("code");
    const reserved = new Set(["provinces", "districts", "communes", "stats", "hierarchy", "item", "raw"]);
    if (reserved.has(rawCode.toLowerCase())) {
        return c.notFound();
    }

    const feature = boundariesService.getBoundaryByCode(rawCode);
    if (!feature) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `Boundary not found for code '${rawCode}'`,
            },
            404,
        );
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(rawCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({
            success: true,
            data: summary || (feature.properties as any),
        });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});
