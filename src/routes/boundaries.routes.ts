import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono, type Context } from "hono";
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

function parseCoordinates(c: Context): { lat: number; lon: number } | { error: string } {
    const latStr = c.req.query("lat") || c.req.query("latitude");
    const lonStr = c.req.query("lng") || c.req.query("lon") || c.req.query("longitude");

    if (!latStr || !lonStr) {
        return { error: "Missing required query parameters 'lat' and 'lng' (or 'lon')" };
    }

    const cleanLat = latStr.trim();
    const cleanLon = lonStr.trim();

    if (
        cleanLat.length > 25 ||
        cleanLon.length > 25 ||
        !/^-?\d+(\.\d+)?$/.test(cleanLat) ||
        !/^-?\d+(\.\d+)?$/.test(cleanLon)
    ) {
        return { error: "Invalid coordinates format: must be valid decimal numbers within 25 characters" };
    }

    const lat = parseFloat(cleanLat);
    const lon = parseFloat(cleanLon);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        return { error: "Invalid coordinates: 'lat' must be [-90, 90] and 'lng'/'lon' [-180, 180]" };
    }

    return { lat, lon };
}

// 1. Cloudflare Workers Global Edge Cache (300+ Edge PoPs, 1-year cache TTL)
boundariesRoutes.use("*", createEdgeCache({ cacheTtlSeconds: 31536000 }));

// 2. HTTP Caching Headers for ultra-fast boundary responses
boundariesRoutes.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const tookMs = Number((performance.now() - start).toFixed(2));
    c.header("X-Response-Time", `${tookMs}ms`);
    // Never let an empty/unloaded dataset response be cached for a year (edge, CDN or browser)
    const datasetReady = boundariesService.getStats().isLoaded;
    if (datasetReady && c.res.status >= 200 && c.res.status < 300) {
        c.header(
            "Cache-Control",
            "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400",
        );
    } else {
        c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    }
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

    const latStr = c.req.query("lat") || c.req.query("latitude");
    const lonStr = c.req.query("lng") || c.req.query("lon") || c.req.query("longitude");
    const lat = latStr && !isNaN(parseFloat(latStr)) ? parseFloat(latStr) : undefined;
    const lon = lonStr && !isNaN(parseFloat(lonStr)) ? parseFloat(lonStr) : undefined;

    // Fast cache lookup for default provinces query
    const isDefaultProvinces = (!level || level === "province") && !provinceCode && !districtCode && !code && !search && !limit && !offset && lat === undefined && lon === undefined;
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
        lat,
        lon,
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
    const latStr = c.req.query("lat") || c.req.query("latitude");
    const lonStr = c.req.query("lng") || c.req.query("lon") || c.req.query("longitude");
    const lat = latStr && !isNaN(parseFloat(latStr)) ? parseFloat(latStr) : undefined;
    const lon = lonStr && !isNaN(parseFloat(lonStr)) ? parseFloat(lonStr) : undefined;

    if (!search && !code && lat === undefined && lon === undefined) {
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
        lat,
        lon,
        format,
    });

    if (result.isGeoJson) {
        const jsonStr = JSON.stringify(result.data);
        if (!search && !code && lat === undefined && lon === undefined) {
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
    if (!search && !code && lat === undefined && lon === undefined) {
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

// =========================================================================
// RESTful Nested Boundary Routes
// =========================================================================

/**
 * GET /api/boundaries/provinces/:provinceCode/districts
 * Get all district boundaries in a province
 */
boundariesRoutes.get("/provinces/:provinceCode/districts", (c) => {
    const provinceCode = c.req.param("provinceCode");
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";

    const result = boundariesService.getBoundaries({
        level: "district",
        provinceCode,
        format,
    });

    if (result.isGeoJson) {
        return c.newResponse(JSON.stringify(result.data), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    return c.json<ApiResponse<BoundarySummaryItem[]>>({
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: { total: result.total, source: "local_cache" },
    });
});

/**
 * GET /api/boundaries/provinces/:provinceCode/districts/:districtCode
 * Get single district boundary under a specific province
 */
boundariesRoutes.get("/provinces/:provinceCode/districts/:districtCode", (c) => {
    const provinceCode = c.req.param("provinceCode");
    const districtCode = c.req.param("districtCode");
    const feature = boundariesService.getBoundaryByCode(districtCode, "district");

    if (!feature) {
        return c.json<ApiResponse<null>>({ success: false, data: null, error: `District boundary '${districtCode}' not found` }, 404);
    }

    const pCode = feature.properties?.province_code || feature.properties?.parent_code;
    const cleanProv = provinceCode.replace(/^KH/i, "");
    const cleanActual = String(pCode ?? "").replace(/^KH/i, "");
    if (cleanActual && cleanProv && cleanActual !== cleanProv) {
        return c.json<ApiResponse<null>>({ success: false, data: null, error: `District '${districtCode}' does not belong to province '${provinceCode}'` }, 404);
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(districtCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({ success: true, data: summary || (feature.properties as any) });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/provinces/:provinceCode/districts/:districtCode/communes
 * Get all commune boundaries in a district under a specific province
 */
boundariesRoutes.get("/provinces/:provinceCode/districts/:districtCode/communes", (c) => {
    const provinceCode = c.req.param("provinceCode");
    const districtCode = c.req.param("districtCode");
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";

    const result = boundariesService.getBoundaries({
        level: "commune",
        districtCode,
        provinceCode,
        format,
    });

    if (result.isGeoJson) {
        return c.newResponse(JSON.stringify(result.data), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    return c.json<ApiResponse<BoundarySummaryItem[]>>({
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: { total: result.total, source: "local_cache" },
    });
});

/**
 * GET /api/boundaries/provinces/:provinceCode/districts/:districtCode/communes/:communeCode
 * Get single commune boundary under full 4-tier nesting path
 */
boundariesRoutes.get("/provinces/:provinceCode/districts/:districtCode/communes/:communeCode", (c) => {
    const communeCode = c.req.param("communeCode");
    const feature = boundariesService.getBoundaryByCode(communeCode, "commune");

    if (!feature) {
        return c.json<ApiResponse<null>>({ success: false, data: null, error: `Commune boundary '${communeCode}' not found` }, 404);
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(communeCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({ success: true, data: summary || (feature.properties as any) });
    }

    return c.newResponse(JSON.stringify(feature), 200, {
        "Content-Type": "application/geo+json; charset=utf-8",
    });
});

/**
 * GET /api/boundaries/districts/:districtCode/communes
 * Shortcut for all commune boundaries in a district
 */
boundariesRoutes.get("/districts/:districtCode/communes", (c) => {
    const districtCode = c.req.param("districtCode");
    const rawFormat = (c.req.query("format") || "geojson").toLowerCase();
    const format = rawFormat === "summary" || rawFormat === "list" ? "summary" : "geojson";

    const result = boundariesService.getBoundaries({
        level: "commune",
        districtCode,
        format,
    });

    if (result.isGeoJson) {
        return c.newResponse(JSON.stringify(result.data), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    return c.json<ApiResponse<BoundarySummaryItem[]>>({
        success: true,
        data: result.data as BoundarySummaryItem[],
        meta: { total: result.total, source: "local_cache" },
    });
});

/**
 * GET /api/boundaries/districts/:districtCode/communes/:communeCode
 * Shortcut for single commune boundary in a district
 */
boundariesRoutes.get("/districts/:districtCode/communes/:communeCode", (c) => {
    const communeCode = c.req.param("communeCode");
    const feature = boundariesService.getBoundaryByCode(communeCode, "commune");

    if (!feature) {
        return c.json<ApiResponse<null>>({ success: false, data: null, error: `Commune boundary '${communeCode}' not found` }, 404);
    }

    const format = (c.req.query("format") || "geojson").toLowerCase();
    if (format === "summary" || format === "list") {
        const summary = boundariesService.getSummaryByCode(communeCode);
        return c.json<ApiResponse<BoundarySummaryItem>>({ success: true, data: summary || (feature.properties as any) });
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
    const latStr = c.req.query("lat") || c.req.query("latitude");
    const lonStr = c.req.query("lng") || c.req.query("lon") || c.req.query("longitude");
    const lat = latStr && !isNaN(parseFloat(latStr)) ? parseFloat(latStr) : undefined;
    const lon = lonStr && !isNaN(parseFloat(lonStr)) ? parseFloat(lonStr) : undefined;

    const rawLimit = c.req.query("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
    const rawOffset = c.req.query("offset");
    const offset = rawOffset ? parseInt(rawOffset, 10) : undefined;

    const result = boundariesService.getBoundaries({
        level: "district",
        provinceCode,
        code,
        search,
        lat,
        lon,
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
    const latStr = c.req.query("lat") || c.req.query("latitude");
    const lonStr = c.req.query("lng") || c.req.query("lon") || c.req.query("longitude");
    const lat = latStr && !isNaN(parseFloat(latStr)) ? parseFloat(latStr) : undefined;
    const lon = lonStr && !isNaN(parseFloat(lonStr)) ? parseFloat(lonStr) : undefined;

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
        lat,
        lon,
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
boundariesRoutes.get("/raw/:filename", async (c) => {
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

    // Cloudflare Workers: no filesystem, the files are deployed as static assets under /boundaries/
    const assets = (c.env as { ASSETS?: { fetch: (req: Request) => Promise<Response> } } | undefined)?.ASSETS;
    if (assets) {
        const assetRes = await assets.fetch(new Request(new URL(`/boundaries/${targetFile}`, c.req.url)));
        if (assetRes.ok) {
            return new Response(assetRes.body, {
                status: 200,
                headers: {
                    "Content-Type": "application/geo+json; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            });
        }
    }

    const candidates = [
        path.resolve(currentDir, "..", "..", "public", "boundaries", targetFile),
        path.resolve(currentDir, "..", "public", "boundaries", targetFile),
        path.resolve(process.cwd(), "public", "boundaries", targetFile),
        path.resolve(process.cwd(), "dist", "public", "boundaries", targetFile),
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
 * GET /api/boundaries/zone
 * GET /api/boundaries/point
 * GET /api/boundaries/by-point
 *
 * Sub-millisecond Point-in-Polygon spatial query:
 * Resolves the official Cambodian administrative boundary zone (Province, District, Commune)
 * containing the given GPS coordinates.
 *
 * Query Parameters:
 * - lat / latitude: coordinate latitude (-90 to 90) [required]
 * - lng / lon / longitude: coordinate longitude (-180 to 180) [required]
 * - level: 'all' (default, 3-tier hierarchy) | 'province' | 'district' | 'commune'
 * - format: 'summary' / 'json' (default for JSON API) | 'geojson' (Feature or FeatureCollection)
 */
const handleZoneLookup = (c: Context) => {
    const coords = parseCoordinates(c);
    if ("error" in coords) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: coords.error,
            },
            400,
        );
    }

    const { lat, lon } = coords;
    const rawLevel = (c.req.query("level") || "all").toLowerCase();
    const level: BoundaryLevel | "all" =
        rawLevel === "province" || rawLevel === "district" || rawLevel === "commune"
            ? rawLevel
            : "all";

    const accept = c.req.header("Accept") || "";
    const rawFormat = (c.req.query("format") || (accept.includes("application/geo+json") ? "geojson" : "geojson")).toLowerCase();
    const format: "geojson" | "summary" | "json" =
        rawFormat === "summary" || rawFormat === "list"
            ? "summary"
            : rawFormat === "json"
            ? "json"
            : "geojson";

    const start = performance.now();
    const result = boundariesService.getZoneByPoint({
        lat,
        lon,
        level,
        format,
    });
    const tookMs = Number((performance.now() - start).toFixed(2));

    if (!result.matched) {
        return c.json<ApiResponse<null>>(
            {
                success: false,
                data: null,
                error: `No boundary zone found containing coordinates (${lat}, ${lon}). Point may be outside Cambodia's administrative boundaries.`,
                meta: {
                    point: { lat, lng: lon },
                    tookMs,
                },
            },
            404,
        );
    }

    if (format === "geojson" && result.geoJson) {
        return c.newResponse(JSON.stringify(result.geoJson), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    // Summary / JSON format
    const responseData =
        level !== "all"
            ? (result as any)[level]
            : {
                point: result.point,
                matched: result.matched,
                province: result.province,
                district: result.district,
                commune: result.commune,
                boundaries: result.boundaries,
            };

    return c.json<ApiResponse<any>>({
        success: true,
        data: responseData,
        meta: {
            point: { lat, lng: lon },
            level,
            tookMs,
            source: "spatial_index",
        },
    });
};

boundariesRoutes.get("/zone", handleZoneLookup);
boundariesRoutes.get("/point", handleZoneLookup);
boundariesRoutes.get("/by-point", handleZoneLookup);

/** Max coordinates per batch request — keeps URLs well under common 8 KB limits and the work bounded. */
const MAX_BATCH_POINTS = 100;
const COORD_RE = /^-?\d{1,3}(\.\d{1,15})?$/;

/**
 * Parses `points=lat,lng;lat,lng;...` (pairs separated by `;` or `|`, whitespace ignored).
 */
function parsePointList(raw: string | undefined): { points: { lat: number; lon: number }[] } | { error: string } {
    if (!raw || !raw.trim()) {
        return { error: "Missing required query parameter 'points' (format: lat,lng;lat,lng;...)" };
    }
    const pairs = raw.split(/[;|]/).map((p) => p.trim()).filter(Boolean);
    if (pairs.length === 0) {
        return { error: "Missing required query parameter 'points' (format: lat,lng;lat,lng;...)" };
    }
    if (pairs.length > MAX_BATCH_POINTS) {
        return { error: `Too many points: ${pairs.length} given, maximum is ${MAX_BATCH_POINTS} per request` };
    }

    const points: { lat: number; lon: number }[] = [];
    for (let i = 0; i < pairs.length; i++) {
        const parts = pairs[i].split(",").map((s) => s.trim());
        if (parts.length !== 2 || !COORD_RE.test(parts[0]) || !COORD_RE.test(parts[1])) {
            return { error: `Invalid point at index ${i}: '${pairs[i].slice(0, 40)}' (expected 'lat,lng' decimal numbers)` };
        }
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return { error: `Invalid point at index ${i}: latitude must be [-90, 90] and longitude [-180, 180]` };
        }
        points.push({ lat, lon });
    }
    return { points };
}

/**
 * GET /api/boundaries/zones
 * GET /api/boundaries/by-points
 *
 * Batch point-in-polygon: resolves the province / district / commune for many GPS coordinates in one request.
 *
 * Query Parameters:
 * - points: `lat,lng;lat,lng;...` (up to 100 pairs, `;` or `|` separated) [required]
 * - level: 'all' (default) | 'province' | 'district' | 'commune'
 * - format: 'summary' (default) — one result per point, in input order, without geometry
 *           'geojson' — FeatureCollection of the distinct matched boundaries; each feature lists
 *                       the input indexes it contains in `properties.point_indexes`
 */
const handleZonesLookup = (c: Context) => {
    const parsed = parsePointList(c.req.query("points"));
    if ("error" in parsed) {
        return c.json<ApiResponse<null>>({ success: false, data: null, error: parsed.error }, 400);
    }

    const rawLevel = (c.req.query("level") || "all").toLowerCase();
    const level: BoundaryLevel | "all" =
        rawLevel === "province" || rawLevel === "district" || rawLevel === "commune" ? rawLevel : "all";
    const rawFormat = (c.req.query("format") || "summary").toLowerCase();
    const asGeoJson = rawFormat === "geojson";
    const tiers: BoundaryLevel[] = level === "all" ? ["province", "district", "commune"] : [level];

    const start = performance.now();

    if (asGeoJson) {
        // Distinct boundaries (keyed by level + code) with the indexes of the points inside each
        const byKey = new Map<string, { feature: any; indexes: number[] }>();
        const unmatched: number[] = [];
        parsed.points.forEach(({ lat, lon }, i) => {
            const r = boundariesService.getZoneByPoint({ lat, lon, level, format: "json" });
            if (!r.matched) {
                unmatched.push(i);
                return;
            }
            for (const tier of tiers) {
                const f = (r as any)[tier];
                if (!f) continue;
                const key = `${tier}:${f.properties?.code}`;
                const hit = byKey.get(key);
                if (hit) hit.indexes.push(i);
                else byKey.set(key, { feature: f, indexes: [i] });
            }
        });

        // Clone so the shared in-memory features are never mutated
        const features = [...byKey.values()].map(({ feature, indexes }) => ({
            ...feature,
            properties: { ...feature.properties, point_indexes: indexes },
        }));
        const boxes = features.map((f) => f.bbox).filter(Boolean) as number[][];
        const fc = {
            type: "FeatureCollection",
            name: "cambodia_zones_by_points",
            crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
            ...(boxes.length && {
                bbox: [
                    Math.min(...boxes.map((b) => b[0])),
                    Math.min(...boxes.map((b) => b[1])),
                    Math.max(...boxes.map((b) => b[2])),
                    Math.max(...boxes.map((b) => b[3])),
                ],
            }),
            features,
            // Foreign members (allowed by RFC 7946): which inputs matched nothing
            points: parsed.points.map(({ lat, lon }) => ({ lat, lng: lon })),
            unmatched,
        };
        return c.newResponse(JSON.stringify(fc), 200, {
            "Content-Type": "application/geo+json; charset=utf-8",
        });
    }

    let matchedCount = 0;
    const data = parsed.points.map(({ lat, lon }, index) => {
        const r = boundariesService.getZoneByPoint({ lat, lon, level, format: "summary" });
        if (r.matched) matchedCount++;
        const item: Record<string, unknown> = { index, point: { lat, lng: lon }, matched: r.matched };
        if (r.matched) for (const tier of tiers) item[tier] = r[tier] ?? null;
        return item;
    });
    const tookMs = Number((performance.now() - start).toFixed(2));

    return c.json<ApiResponse<any>>({
        success: true,
        data,
        meta: {
            count: data.length,
            matched: matchedCount,
            unmatched: data.length - matchedCount,
            level,
            tookMs,
            source: "spatial_index",
        },
    });
};

boundariesRoutes.get("/zones", handleZonesLookup);
boundariesRoutes.get("/by-points", handleZonesLookup);

/**
 * GET /api/boundaries/:code
 * Shortcut for single boundary lookup by code (e.g. '12', 'KH12', '1201', '120101')
 */
boundariesRoutes.get("/:code", (c) => {
    const rawCode = c.req.param("code");
    const reserved = new Set([
        "provinces",
        "districts",
        "communes",
        "stats",
        "hierarchy",
        "item",
        "raw",
        "zone",
        "point",
        "by-point",
        "zones",
        "by-points",
    ]);
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
