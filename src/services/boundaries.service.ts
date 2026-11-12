import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdminStore } from "../data/store.ts";
import type {
    BoundaryFeature,
    BoundaryFeatureCollection,
    BoundaryFilterOptions,
    BoundaryLevel,
    BoundaryPointLookupOptions,
    BoundaryProperties,
    BoundaryStats,
    BoundarySummaryItem,
    BoundaryZoneResult,
    CountGroup,
} from "../types/boundaries.ts";
import process from "node:process";

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

/**
 * Compute 2D GeoJSON bounding box [minLon, minLat, maxLon, maxLat]
 */
function computeBBox(coordinates: any): [number, number, number, number] {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    function traverse(item: any): void {
        if (Array.isArray(item)) {
            if (item.length >= 2 && typeof item[0] === "number" && typeof item[1] === "number") {
                const lon = item[0];
                const lat = item[1];
                if (lon < minLon) minLon = lon;
                if (lat < minLat) minLat = lat;
                if (lon > maxLon) maxLon = lon;
                if (lat > maxLat) maxLat = lat;
            } else {
                for (let i = 0; i < item.length; i++) {
                    traverse(item[i]);
                }
            }
        }
    }

    traverse(coordinates);

    // Fallback if empty
    if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) {
        return [102.3, 10.4, 107.7, 14.7];
    }

    return [
        Number(minLon.toFixed(6)),
        Number(minLat.toFixed(6)),
        Number(maxLon.toFixed(6)),
        Number(maxLat.toFixed(6)),
    ];
}

/**
 * Compute centroid point [lon, lat] from coordinates
 */
function computeCentroid(bbox: [number, number, number, number]): { lat: number; lon: number } {
    return {
        lat: Number(((bbox[1] + bbox[3]) / 2).toFixed(6)),
        lon: Number(((bbox[0] + bbox[2]) / 2).toFixed(6)),
    };
}

/**
 * Normalize code: removes non-alphanumeric, strips leading 'KH'
 */
function normalizeCode(raw: string): string {
    return raw.trim().toUpperCase().replace(/^KH/, "");
}

/**
 * Test if a point [lon, lat] is inside a 2D bounding box [minLon, minLat, maxLon, maxLat]
 */
function pointInBBox(lon: number, lat: number, bbox: [number, number, number, number]): boolean {
    return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

/**
 * Standard Ray Casting algorithm for a single polygon ring
 */
function pointInRing(x: number, y: number, ring: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Check if point [x, y] is inside a Polygon (with hole exclusion)
 */
function pointInPolygon(x: number, y: number, coords: [number, number][][]): boolean {
    if (!coords || coords.length === 0) return false;
    if (!pointInRing(x, y, coords[0])) return false;
    for (let i = 1; i < coords.length; i++) {
        if (pointInRing(x, y, coords[i])) return false;
    }
    return true;
}

/**
 * Check if point [x, y] is inside a MultiPolygon
 */
function pointInMultiPolygon(x: number, y: number, coords: [number, number][][][]): boolean {
    for (let i = 0; i < coords.length; i++) {
        if (pointInPolygon(x, y, coords[i])) return true;
    }
    return false;
}

/**
 * Check if point [lon, lat] is inside a GeoJSON geometry
 */
function pointInGeometry(lon: number, lat: number, geometry: any): boolean {
    if (!geometry || !geometry.coordinates) return false;
    if (geometry.type === "Polygon") {
        return pointInPolygon(lon, lat, geometry.coordinates);
    }
    if (geometry.type === "MultiPolygon") {
        return pointInMultiPolygon(lon, lat, geometry.coordinates);
    }
    return false;
}

export interface BoundariesSeedData {
    provinces?: BoundaryFeatureCollection | BoundaryFeature[];
    districts?: BoundaryFeatureCollection | BoundaryFeature[];
    communes?: BoundaryFeatureCollection | BoundaryFeature[];
}

export class BoundariesService {
    private static instance: BoundariesService | null = null;
    private static bundledSeed: BoundariesSeedData | null = null;

    public static registerSeed(seed: BoundariesSeedData): void {
        BoundariesService.bundledSeed = seed;
    }
    private isInitialized = false;

    // Feature collections
    private provinceFeatures: BoundaryFeature[] = [];
    private districtFeatures: BoundaryFeature[] = [];
    private communeFeatures: BoundaryFeature[] = [];

    // O(1) Lookups
    private featureByCode = new Map<string, BoundaryFeature>();
    private featuresByLevel = new Map<BoundaryLevel, BoundaryFeature[]>();
    private districtsByProvinceCode = new Map<string, BoundaryFeature[]>();
    private communesByDistrictCode = new Map<string, BoundaryFeature[]>();
    private communesByProvinceCode = new Map<string, BoundaryFeature[]>();

    // Summary Lookups (lightweight, no coordinates)
    private summaryByCode = new Map<string, BoundarySummaryItem>();
    private summariesByLevel = new Map<BoundaryLevel, BoundarySummaryItem[]>();
    private districtsSummaryByProvince = new Map<string, BoundarySummaryItem[]>();
    private communesSummaryByDistrict = new Map<string, BoundarySummaryItem[]>();
    private communesSummaryByProvince = new Map<string, BoundarySummaryItem[]>();

    // Overall Bounding Box for Cambodia
    private overallBbox: [number, number, number, number] = [102.3, 10.4, 107.7, 14.7];

    // Response Cache for Instant Serialized Delivery
    private preSerializedCache = new Map<string, string>();

    private constructor() {
        this.ensureLoaded();
    }

    public static getInstance(): BoundariesService {
        if (!BoundariesService.instance) {
            BoundariesService.instance = new BoundariesService();
        }
        return BoundariesService.instance;
    }

    /**
     * Locate directory containing boundary geojson files
     */
    private findBoundariesDir(): string | null {
        if (!currentDir || typeof fs?.existsSync !== "function") {
            return null;
        }

        const candidates = [
            path.resolve(currentDir, "..", "..", "public", "boundaries"),
            path.resolve(currentDir, "..", "public", "boundaries"),
            path.resolve(process.cwd(), "public", "boundaries"),
            path.resolve(process.cwd(), "dist", "public", "boundaries"),
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(path.join(candidate, "province.geojson"))) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * Load, parse, enrich, and index all boundaries
     */
    public ensureLoaded(): boolean {
        if (this.isInitialized) return true;

        if (BoundariesService.bundledSeed) {
            try {
                const adminStore = AdminStore.getInstance();
                const seed = BoundariesService.bundledSeed;

                const provFeatures = Array.isArray(seed.provinces)
                    ? seed.provinces
                    : (seed.provinces as any)?.features || [];
                this.loadProvinceFeatures(provFeatures, adminStore);

                const distFeatures = Array.isArray(seed.districts)
                    ? seed.districts
                    : (seed.districts as any)?.features || [];
                this.loadDistrictFeatures(distFeatures, adminStore);

                const comFeatures = Array.isArray(seed.communes)
                    ? seed.communes
                    : (seed.communes as any)?.features || [];
                this.loadCommuneFeatures(comFeatures, adminStore);

                this.featuresByLevel.set("province", this.provinceFeatures);
                this.featuresByLevel.set("district", this.districtFeatures);
                this.featuresByLevel.set("commune", this.communeFeatures);

                this.summariesByLevel.set(
                    "province",
                    this.provinceFeatures.map((f) => this.toSummary(f)),
                );
                this.summariesByLevel.set(
                    "district",
                    this.districtFeatures.map((f) => this.toSummary(f)),
                );
                this.summariesByLevel.set(
                    "commune",
                    this.communeFeatures.map((f) => this.toSummary(f)),
                );

                this.isInitialized = true;
                return true;
            } catch (err) {
                console.error("[BoundariesService] Error loading bundled boundary seed:", err);
            }
        }

        const dataDir = this.findBoundariesDir();
        if (!dataDir) {
            console.warn("[BoundariesService] Boundaries directory not found on filesystem.");
            return false;
        }

        try {
            const adminStore = AdminStore.getInstance();

            // 1. Load Provinces
            const provinceFile = path.join(dataDir, "province.geojson");
            if (fs.existsSync(provinceFile)) {
                const raw = JSON.parse(fs.readFileSync(provinceFile, "utf-8"));
                this.loadProvinceFeatures(raw.features || [], adminStore);
            }

            // 2. Load Districts
            const districtFile = path.join(dataDir, "district.geojson");
            if (fs.existsSync(districtFile)) {
                const raw = JSON.parse(fs.readFileSync(districtFile, "utf-8"));
                this.loadDistrictFeatures(raw.features || [], adminStore);
            }

            // 3. Load Communes
            const communeFile = path.join(dataDir, "commune.geojson");
            if (fs.existsSync(communeFile)) {
                const raw = JSON.parse(fs.readFileSync(communeFile, "utf-8"));
                this.loadCommuneFeatures(raw.features || [], adminStore);
            }

            this.featuresByLevel.set("province", this.provinceFeatures);
            this.featuresByLevel.set("district", this.districtFeatures);
            this.featuresByLevel.set("commune", this.communeFeatures);

            this.summariesByLevel.set(
                "province",
                this.provinceFeatures.map((f) => this.toSummary(f)),
            );
            this.summariesByLevel.set(
                "district",
                this.districtFeatures.map((f) => this.toSummary(f)),
            );
            this.summariesByLevel.set(
                "commune",
                this.communeFeatures.map((f) => this.toSummary(f)),
            );

            this.isInitialized = true;
            return true;
        } catch (err) {
            console.error("[BoundariesService] Error loading boundary datasets:", err);
            return false;
        }
    }

    private toSummary(feature: BoundaryFeature): BoundarySummaryItem {
        const p = feature.properties;
        return {
            id: p.id,
            code: p.code,
            pcode: p.pcode,
            name: p.name,
            name_en: p.name_en,
            name_km: p.name_km,
            type_km: p.type_km,
            level: p.level,
            province_code: p.province_code,
            province_name_en: p.province_name_en,
            province_name_km: p.province_name_km,
            district_code: p.district_code,
            district_name_en: p.district_name_en,
            district_name_km: p.district_name_km,
            lat: p.lat,
            lon: p.lon,
            bbox: p.bbox,
            shape_length: p.shape_length,
            shape_area: p.shape_area,
        };
    }

    private loadProvinceFeatures(rawFeatures: any[], adminStore: AdminStore): void {
        this.provinceFeatures = [];

        for (const raw of rawFeatures) {
            const props = raw.properties || {};
            const pcode = String(props.ADM1_PCODE || "").trim().toUpperCase();
            const code = normalizeCode(pcode).padStart(2, "0");
            const bbox = computeBBox(raw.geometry?.coordinates);
            const centroid = computeCentroid(bbox);

            // Look up in AdminStore
            const adminItem = adminStore.getItemByCode(code) || adminStore.getItemById(parseInt(code, 10));

            const nameEn = adminItem?.name_en || String(props.ADM1_EN || "").trim();
            const nameKm = adminItem?.name_km || "";
            const typeKm = adminItem?.typeKm || (code === "12" ? "រាជធានី" : "ខេត្ត");
            const id = adminItem?.id || parseInt(code, 10);
            const lat = adminItem?.lat || centroid.lat;
            const lon = adminItem?.lon || centroid.lon;

            const enrichedProps: BoundaryProperties = {
                id,
                code,
                pcode: pcode || `KH${code}`,
                name: nameEn,
                name_en: nameEn,
                name_km: nameKm,
                type_km: typeKm,
                level: "province",
                province_code: code,
                province_name_en: nameEn,
                province_name_km: nameKm,
                lat,
                lon,
                bbox,
                shape_length: props.Shape_Leng ? Number(props.Shape_Leng) : undefined,
                shape_area: props.Shape_Area ? Number(props.Shape_Area) : undefined,
                date: props.date,
                validOn: props.validOn,
            };

            const feature: BoundaryFeature = {
                type: "Feature",
                id,
                properties: enrichedProps,
                geometry: raw.geometry,
                bbox,
            };

            this.provinceFeatures.push(feature);

            // Index by both clean code ("12") and PCODE ("KH12")
            this.featureByCode.set(code, feature);
            this.featureByCode.set(`KH${code}`, feature);
            this.featureByCode.set(String(id), feature);

            const summary = this.toSummary(feature);
            this.summaryByCode.set(code, summary);
            this.summaryByCode.set(`KH${code}`, summary);
            this.summaryByCode.set(String(id), summary);
        }

        // Sort provinces by code
        this.provinceFeatures.sort((a, b) => a.properties.id - b.properties.id);
    }

    private loadDistrictFeatures(rawFeatures: any[], adminStore: AdminStore): void {
        this.districtFeatures = [];

        for (const raw of rawFeatures) {
            const props = raw.properties || {};
            const pcode = String(props.ADM2_PCODE || "").trim().toUpperCase();
            const code = normalizeCode(pcode).padStart(4, "0");
            const provPcode = String(props.ADM1_PCODE || "").trim().toUpperCase();
            const provinceCode = normalizeCode(provPcode).padStart(2, "0");

            const bbox = computeBBox(raw.geometry?.coordinates);
            const centroid = computeCentroid(bbox);

            const adminItem = adminStore.getItemByCode(code) || adminStore.getItemById(parseInt(code, 10));
            const provinceItem = adminStore.getItemByCode(provinceCode) || adminStore.getItemById(parseInt(provinceCode, 10));

            const nameEn = adminItem?.name_en || String(props.ADM2_EN || "").trim();
            const nameKm = adminItem?.name_km || "";
            const typeKm = adminItem?.typeKm || "ស្រុក";
            const id = adminItem?.id || parseInt(code, 10);
            const lat = adminItem?.lat || centroid.lat;
            const lon = adminItem?.lon || centroid.lon;

            const enrichedProps: BoundaryProperties = {
                id,
                code,
                pcode: pcode || `KH${code}`,
                name: nameEn,
                name_en: nameEn,
                name_km: nameKm,
                type_km: typeKm,
                level: "district",
                province_code: provinceCode,
                province_name_en: provinceItem?.name_en || String(props.ADM1_EN || "").trim(),
                province_name_km: provinceItem?.name_km || "",
                lat,
                lon,
                bbox,
                shape_length: props.Shape_Leng ? Number(props.Shape_Leng) : undefined,
                shape_area: props.Shape_Area ? Number(props.Shape_Area) : undefined,
                date: props.date,
                validOn: props.validOn,
            };

            const feature: BoundaryFeature = {
                type: "Feature",
                id,
                properties: enrichedProps,
                geometry: raw.geometry,
                bbox,
            };

            this.districtFeatures.push(feature);

            this.featureByCode.set(code, feature);
            this.featureByCode.set(`KH${code}`, feature);
            this.featureByCode.set(String(id), feature);

            const summary = this.toSummary(feature);
            this.summaryByCode.set(code, summary);
            this.summaryByCode.set(`KH${code}`, summary);
            this.summaryByCode.set(String(id), summary);

            // Group by province code
            const provList = this.districtsByProvinceCode.get(provinceCode) || [];
            provList.push(feature);
            this.districtsByProvinceCode.set(provinceCode, provList);

            const provSumList = this.districtsSummaryByProvince.get(provinceCode) || [];
            provSumList.push(summary);
            this.districtsSummaryByProvince.set(provinceCode, provSumList);
        }

        this.districtFeatures.sort((a, b) => a.properties.id - b.properties.id);
    }

    private loadCommuneFeatures(rawFeatures: any[], adminStore: AdminStore): void {
        this.communeFeatures = [];

        for (const raw of rawFeatures) {
            const props = raw.properties || {};
            const pcode = String(props.ADM3_PCODE || "").trim().toUpperCase();
            const code = normalizeCode(pcode).padStart(6, "0");
            const distPcode = String(props.ADM2_PCODE || "").trim().toUpperCase();
            const districtCode = normalizeCode(distPcode).padStart(4, "0");
            const provPcode = String(props.ADM1_PCODE || "").trim().toUpperCase();
            const provinceCode = normalizeCode(provPcode).padStart(2, "0");

            const bbox = computeBBox(raw.geometry?.coordinates);
            const centroid = computeCentroid(bbox);

            const adminItem = adminStore.getItemByCode(code) || adminStore.getItemById(parseInt(code, 10));
            const districtItem = adminStore.getItemByCode(districtCode) || adminStore.getItemById(parseInt(districtCode, 10));
            const provinceItem = adminStore.getItemByCode(provinceCode) || adminStore.getItemById(parseInt(provinceCode, 10));

            const nameEn = adminItem?.name_en || String(props.ADM3_EN || "").trim();
            const nameKm = adminItem?.name_km || "";
            const typeKm = adminItem?.typeKm || "ឃុំ";
            const id = adminItem?.id || parseInt(code, 10);
            const lat = adminItem?.lat || centroid.lat;
            const lon = adminItem?.lon || centroid.lon;

            const enrichedProps: BoundaryProperties = {
                id,
                code,
                pcode: pcode || `KH${code}`,
                name: nameEn,
                name_en: nameEn,
                name_km: nameKm,
                type_km: typeKm,
                level: "commune",
                district_code: districtCode,
                district_name_en: districtItem?.name_en || String(props.ADM2_EN || "").trim(),
                district_name_km: districtItem?.name_km || "",
                province_code: provinceCode,
                province_name_en: provinceItem?.name_en || String(props.ADM1_EN || "").trim(),
                province_name_km: provinceItem?.name_km || "",
                lat,
                lon,
                bbox,
                shape_length: props.Shape_Leng ? Number(props.Shape_Leng) : undefined,
                shape_area: props.Shape_Area ? Number(props.Shape_Area) : undefined,
                date: props.date,
                validOn: props.validOn,
            };

            const feature: BoundaryFeature = {
                type: "Feature",
                id,
                properties: enrichedProps,
                geometry: raw.geometry,
                bbox,
            };

            this.communeFeatures.push(feature);

            this.featureByCode.set(code, feature);
            this.featureByCode.set(`KH${code}`, feature);
            this.featureByCode.set(String(id), feature);

            const summary = this.toSummary(feature);
            this.summaryByCode.set(code, summary);
            this.summaryByCode.set(`KH${code}`, summary);
            this.summaryByCode.set(String(id), summary);

            // Group by district code
            const distList = this.communesByDistrictCode.get(districtCode) || [];
            distList.push(feature);
            this.communesByDistrictCode.set(districtCode, distList);

            const distSumList = this.communesSummaryByDistrict.get(districtCode) || [];
            distSumList.push(summary);
            this.communesSummaryByDistrict.set(districtCode, distSumList);

            // Group by province code
            const provList = this.communesByProvinceCode.get(provinceCode) || [];
            provList.push(feature);
            this.communesByProvinceCode.set(provinceCode, provList);

            const provSumList = this.communesSummaryByProvince.get(provinceCode) || [];
            provSumList.push(summary);
            this.communesSummaryByProvince.set(provinceCode, provSumList);
        }

        this.communeFeatures.sort((a, b) => a.properties.id - b.properties.id);
    }

    /**
     * Query and filter boundaries with support for level, parent codes, search, pagination, format
     */
    public getBoundaries(options: BoundaryFilterOptions = {}): {
        total: number;
        level: BoundaryLevel;
        data: BoundaryFeatureCollection | BoundarySummaryItem[];
        isGeoJson: boolean;
    } {
        this.ensureLoaded();

        let targetLevel: BoundaryLevel = options.level || "province";
        if (!options.level) {
            if (options.districtCode) {
                targetLevel = "commune";
            } else if (options.provinceCode) {
                targetLevel = "district";
            }
        }

        const isGeoJson = options.format !== "summary" && options.format !== "list";
        const cleanProvince = options.provinceCode ? normalizeCode(options.provinceCode).padStart(2, "0") : undefined;
        const cleanDistrict = options.districtCode ? normalizeCode(options.districtCode).padStart(4, "0") : undefined;
        const cleanCode = options.code ? normalizeCode(options.code) : undefined;
        const searchNormalized = options.search ? AdminStore.normalize(options.search) : undefined;

        if (isGeoJson) {
            let features: BoundaryFeature[] = [];

            if (targetLevel === "province") {
                features = this.provinceFeatures;
            } else if (targetLevel === "district") {
                if (cleanProvince) {
                    features = this.districtsByProvinceCode.get(cleanProvince) || [];
                } else {
                    features = this.districtFeatures;
                }
            } else if (targetLevel === "commune") {
                if (cleanDistrict) {
                    features = this.communesByDistrictCode.get(cleanDistrict) || [];
                } else if (cleanProvince) {
                    features = this.communesByProvinceCode.get(cleanProvince) || [];
                } else {
                    features = this.communeFeatures;
                }
            }

            // Apply exact code filter if specified
            if (cleanCode) {
                features = features.filter((f) => {
                    const p = f.properties;
                    return p.code === cleanCode || p.code.endsWith(cleanCode) || p.pcode === `KH${cleanCode}`;
                });
            }

            // Apply text search if specified
            if (searchNormalized) {
                features = features.filter((f) => {
                    const p = f.properties;
                    const en = AdminStore.normalize(p.name_en || "");
                    const km = AdminStore.normalize(p.name_km || "");
                    return en.includes(searchNormalized) || km.includes(searchNormalized);
                });
            }

            // Apply coordinates point-in-polygon filter if specified
            if (options.lat !== undefined && options.lon !== undefined) {
                const lat = options.lat;
                const lon = options.lon;
                features = features.filter((f) => {
                    return f.bbox && pointInBBox(lon, lat, f.bbox) && pointInGeometry(lon, lat, f.geometry);
                });
            }

            const total = features.length;
            const offset = options.offset && options.offset > 0 ? options.offset : 0;
            const limit = options.limit && options.limit > 0 ? options.limit : features.length;
            const sliced = features.slice(offset, offset + limit);

            const featureCollection: BoundaryFeatureCollection = {
                type: "FeatureCollection",
                name: `cambodia_${targetLevel}_boundaries`,
                crs: {
                    type: "name",
                    properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
                },
                bbox: this.overallBbox,
                features: sliced,
            };

            return {
                total,
                level: targetLevel,
                data: featureCollection,
                isGeoJson: true,
            };
        } else {
            // Summary format
            let summaries: BoundarySummaryItem[] = [];

            if (targetLevel === "province") {
                summaries = this.summariesByLevel.get("province") || [];
            } else if (targetLevel === "district") {
                if (cleanProvince) {
                    summaries = this.districtsSummaryByProvince.get(cleanProvince) || [];
                } else {
                    summaries = this.summariesByLevel.get("district") || [];
                }
            } else if (targetLevel === "commune") {
                if (cleanDistrict) {
                    summaries = this.communesSummaryByDistrict.get(cleanDistrict) || [];
                } else if (cleanProvince) {
                    summaries = this.communesSummaryByProvince.get(cleanProvince) || [];
                } else {
                    summaries = this.summariesByLevel.get("commune") || [];
                }
            }

            if (cleanCode) {
                summaries = summaries.filter((s) => {
                    return s.code === cleanCode || s.code.endsWith(cleanCode) || s.pcode === `KH${cleanCode}`;
                });
            }

            if (searchNormalized) {
                summaries = summaries.filter((s) => {
                    const en = AdminStore.normalize(s.name_en || "");
                    const km = AdminStore.normalize(s.name_km || "");
                    return en.includes(searchNormalized) || km.includes(searchNormalized);
                });
            }

            // Apply coordinates point-in-polygon filter if specified
            if (options.lat !== undefined && options.lon !== undefined) {
                const lat = options.lat;
                const lon = options.lon;
                const matchingCodes = new Set(
                    (this.featuresByLevel.get(targetLevel) || [])
                        .filter((f) => f.bbox && pointInBBox(lon, lat, f.bbox) && pointInGeometry(lon, lat, f.geometry))
                        .map((f) => f.properties.code),
                );
                summaries = summaries.filter((s) => matchingCodes.has(s.code));
            }

            const total = summaries.length;
            const offset = options.offset && options.offset > 0 ? options.offset : 0;
            const limit = options.limit && options.limit > 0 ? options.limit : summaries.length;
            const sliced = summaries.slice(offset, offset + limit);

            return {
                total,
                level: targetLevel,
                data: sliced,
                isGeoJson: false,
            };
        }
    }

    /**
     * Get a single boundary feature by code or PCODE (e.g. "12", "KH12", "1201", "120101")
     */
    public getBoundaryByCode(rawCode: string, level?: BoundaryLevel): BoundaryFeature | undefined {
        this.ensureLoaded();
        const code = normalizeCode(rawCode);

        // Try direct lookup
        let feature = this.featureByCode.get(code) || this.featureByCode.get(`KH${code}`);
        if (feature) {
            if (!level || feature.properties.level === level) {
                return feature;
            }
        }

        // Try padded variations
        if (level === "province" || code.length <= 2) {
            const padded = code.padStart(2, "0");
            feature = this.featureByCode.get(padded) || this.featureByCode.get(`KH${padded}`);
            if (feature) return feature;
        }

        if (level === "district" || (code.length > 2 && code.length <= 4)) {
            const padded = code.padStart(4, "0");
            feature = this.featureByCode.get(padded) || this.featureByCode.get(`KH${padded}`);
            if (feature) return feature;
        }

        if (level === "commune" || code.length > 4) {
            const padded = code.padStart(6, "0");
            feature = this.featureByCode.get(padded) || this.featureByCode.get(`KH${padded}`);
            if (feature) return feature;
        }

        return undefined;
    }

    /**
     * Get a single boundary summary item by code or PCODE
     */
    public getSummaryByCode(rawCode: string): BoundarySummaryItem | undefined {
        this.ensureLoaded();
        const code = normalizeCode(rawCode);
        let summary = this.summaryByCode.get(code) || this.summaryByCode.get(`KH${code}`);
        if (summary) return summary;

        for (const pad of [2, 4, 6]) {
            const padded = code.padStart(pad, "0");
            summary = this.summaryByCode.get(padded) || this.summaryByCode.get(`KH${padded}`);
            if (summary) return summary;
        }

        return undefined;
    }

    /**
     * Resolve ascending boundary hierarchy (e.g. Commune -> District -> Province)
     */
    public getHierarchy(rawCode: string): {
        province?: BoundaryFeature;
        district?: BoundaryFeature;
        commune?: BoundaryFeature;
    } {
        this.ensureLoaded();
        const feature = this.getBoundaryByCode(rawCode);
        if (!feature) return {};

        const res: {
            province?: BoundaryFeature;
            district?: BoundaryFeature;
            commune?: BoundaryFeature;
        } = {};

        const level = feature.properties.level;
        if (level === "province") {
            res.province = feature;
        } else if (level === "district") {
            res.district = feature;
            if (feature.properties.province_code) {
                res.province = this.getBoundaryByCode(feature.properties.province_code, "province");
            }
        } else if (level === "commune") {
            res.commune = feature;
            if (feature.properties.district_code) {
                res.district = this.getBoundaryByCode(feature.properties.district_code, "district");
            }
            if (feature.properties.province_code) {
                res.province = this.getBoundaryByCode(feature.properties.province_code, "province");
            }
        }

        return res;
    }

    /**
     * Find boundary feature containing coordinate (lon, lat) at a specific administrative level
     */
    public findFeatureByPoint(
        lon: number,
        lat: number,
        level: BoundaryLevel,
        parentCode?: string,
    ): BoundaryFeature | undefined {
        this.ensureLoaded();

        let pool: BoundaryFeature[] = [];
        if (level === "province") {
            pool = this.provinceFeatures;
        } else if (level === "district") {
            if (parentCode) {
                const cleanProv = normalizeCode(parentCode).padStart(2, "0");
                pool = this.districtsByProvinceCode.get(cleanProv) || [];
            }
            if (pool.length === 0) {
                pool = this.districtFeatures;
            }
        } else if (level === "commune") {
            if (parentCode) {
                const cleanDist = normalizeCode(parentCode).padStart(4, "0");
                pool = this.communesByDistrictCode.get(cleanDist) || [];
            }
            if (pool.length === 0) {
                pool = this.communeFeatures;
            }
        }

        // 1. Fast BBox check + Ray Casting on pool
        for (const f of pool) {
            if (f.bbox && pointInBBox(lon, lat, f.bbox)) {
                if (pointInGeometry(lon, lat, f.geometry)) {
                    return f;
                }
            }
        }

        // 2. If parentCode was specified but no match found in subset, fallback to full level pool
        if (parentCode) {
            const fallbackPool = this.featuresByLevel.get(level) || [];
            if (fallbackPool !== pool) {
                for (const f of fallbackPool) {
                    if (f.bbox && pointInBBox(lon, lat, f.bbox)) {
                        if (pointInGeometry(lon, lat, f.geometry)) {
                            return f;
                        }
                    }
                }
            }
        }

        return undefined;
    }

    /**
     * Resolve boundary zone hierarchy (Province, District, Commune) for GPS coordinates (lat, lon)
     */
    public getZoneByPoint(options: BoundaryPointLookupOptions): BoundaryZoneResult {
        this.ensureLoaded();

        const { lat, lon } = options;
        const requestedLevel = options.level || "all";
        const isGeoJson = options.format === "geojson";
        const isSummary = options.format === "summary" || options.format === "list";

        // Check if point is inside or near Cambodia's bounding box (+0.1 deg margin for border waters/islands)
        const margin = 0.1;
        const inCambodiaBbox =
            lon >= this.overallBbox[0] - margin &&
            lon <= this.overallBbox[2] + margin &&
            lat >= this.overallBbox[1] - margin &&
            lat <= this.overallBbox[3] + margin;

        if (!inCambodiaBbox) {
            return {
                matched: false,
                point: { lat, lng: lon },
            };
        }

        // If a specific level is requested, resolve directly
        if (requestedLevel !== "all") {
            const feature = this.findFeatureByPoint(lon, lat, requestedLevel);
            if (!feature) {
                return {
                    matched: false,
                    point: { lat, lng: lon },
                };
            }

            if (isSummary) {
                const summary = this.toSummary(feature);
                return {
                    matched: true,
                    point: { lat, lng: lon },
                    [requestedLevel]: summary,
                };
            }

            const singleFc: BoundaryFeatureCollection = {
                type: "FeatureCollection",
                name: `cambodia_${requestedLevel}_boundary`,
                crs: {
                    type: "name",
                    properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
                },
                bbox: feature.bbox ?? this.overallBbox,
                features: [feature],
            };

            return {
                matched: true,
                point: { lat, lng: lon },
                [requestedLevel]: feature,
                boundaries: singleFc,
                geoJson: isGeoJson ? feature : singleFc,
            };
        }

        // Complete 3-tier hierarchy lookup: Province -> District -> Commune
        const provinceFeature = this.findFeatureByPoint(lon, lat, "province");
        const districtFeature = this.findFeatureByPoint(
            lon,
            lat,
            "district",
            provinceFeature?.properties?.code,
        );
        const communeFeature = this.findFeatureByPoint(
            lon,
            lat,
            "commune",
            districtFeature?.properties?.code,
        );

        const matched = !!(provinceFeature || districtFeature || communeFeature);
        if (!matched) {
            return {
                matched: false,
                point: { lat, lng: lon },
            };
        }

        const matchedFeatures: BoundaryFeature[] = [];
        if (provinceFeature) matchedFeatures.push(provinceFeature);
        if (districtFeature) matchedFeatures.push(districtFeature);
        if (communeFeature) matchedFeatures.push(communeFeature);

        const featureCollection: BoundaryFeatureCollection = {
            type: "FeatureCollection",
            name: "cambodia_zone_boundaries",
            crs: {
                type: "name",
                properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
            },
            bbox: [
                Math.min(...matchedFeatures.map((f) => f.bbox?.[0] ?? lon)),
                Math.min(...matchedFeatures.map((f) => f.bbox?.[1] ?? lat)),
                Math.max(...matchedFeatures.map((f) => f.bbox?.[2] ?? lon)),
                Math.max(...matchedFeatures.map((f) => f.bbox?.[3] ?? lat)),
            ],
            features: matchedFeatures,
        };

        if (isGeoJson) {
            return {
                matched: true,
                point: { lat, lng: lon },
                province: provinceFeature,
                district: districtFeature,
                commune: communeFeature,
                boundaries: featureCollection,
                geoJson: featureCollection,
            };
        }

        if (isSummary) {
            return {
                matched: true,
                point: { lat, lng: lon },
                province: provinceFeature ? this.toSummary(provinceFeature) : undefined,
                district: districtFeature ? this.toSummary(districtFeature) : undefined,
                commune: communeFeature ? this.toSummary(communeFeature) : undefined,
            };
        }

        // Full JSON format: includes full boundary features with geometry + FeatureCollection
        return {
            matched: true,
            point: { lat, lng: lon },
            province: provinceFeature,
            district: districtFeature,
            commune: communeFeature,
            boundaries: featureCollection,
            geoJson: featureCollection,
        };
    }

    /**
     * Count points per boundary at one level (e.g. customers per commune).
     *
     * Resolves top-down (province → district → commune, stopping at `level`) so each step only scans the
     * children of the previous match, and memoizes identical coordinates within the call.
     * Groups keep first-seen order; `point` is the first input point that fell in the group.
     */
    public countByPoints(
        points: { lat: number; lon: number }[],
        level: BoundaryLevel | "all",
    ): {
        groups: CountGroup[];
        unmatched: { count: number; point: { lat: number; lng: number } | null; indexes: number[] };
    } {
        this.ensureLoaded();

        const tiers: BoundaryLevel[] = level === "all" ? ["province", "district", "commune"] : [level];
        const deepest = tiers[tiers.length - 1];
        const [minLon, minLat, maxLon, maxLat] = this.overallBbox;
        const margin = 0.1;
        type Hit = Partial<Record<BoundaryLevel, BoundaryFeature>>;
        const memo = new Map<string, Hit | null>();

        // Top-down: each step only scans the children of the previous match
        const resolve = (lat: number, lon: number): Hit | null => {
            if (lon < minLon - margin || lon > maxLon + margin || lat < minLat - margin || lat > maxLat + margin) {
                return null;
            }
            const hit: Hit = {};
            hit.province = this.findFeatureByPoint(lon, lat, "province");
            if (deepest !== "province") {
                hit.district = this.findFeatureByPoint(lon, lat, "district", hit.province?.properties?.code);
                if (deepest === "commune") {
                    hit.commune = this.findFeatureByPoint(lon, lat, "commune", hit.district?.properties?.code);
                }
            }
            // A point counts as matched only when it resolves at the deepest requested level
            return hit[deepest] ? hit : null;
        };

        const byKey = new Map<string, CountGroup>();
        const unmatched = { count: 0, point: null as { lat: number; lng: number } | null, indexes: [] as number[] };

        points.forEach(({ lat, lon }, i) => {
            const key = `${lat},${lon}`;
            let hit = memo.get(key);
            if (hit === undefined) {
                hit = resolve(lat, lon);
                memo.set(key, hit);
            }
            if (!hit) {
                unmatched.count++;
                unmatched.indexes.push(i);
                unmatched.point ??= { lat, lng: lon };
                return;
            }
            // parent = the group this point was resolved through one tier up (lets level=all nest the result)
            let parent: string | undefined;
            for (const tier of tiers) {
                const feature = hit[tier];
                if (!feature) continue;
                const groupKey = `${tier}:${feature.properties?.code}`;
                const group = byKey.get(groupKey);
                if (group) group.count++;
                else byKey.set(groupKey, { key: groupKey, parent, level: tier, feature, count: 1, point: { lat, lng: lon } });
                parent = groupKey;
            }
        });

        // With level=all keep the hierarchy readable: provinces, then districts, then communes
        const order: Record<BoundaryLevel, number> = { province: 0, district: 1, commune: 2 };
        const groups = [...byKey.values()].sort((a, b) => order[a.level] - order[b.level]);
        return { groups, unmatched };
    }

    /** Public summary view of a feature (no geometry). */
    public summarize(feature: BoundaryFeature): BoundarySummaryItem {
        return this.toSummary(feature);
    }

    /**
     * Get summary statistics of loaded boundaries
     */
    public getStats(): BoundaryStats {
        this.ensureLoaded();
        return {
            provinces: this.provinceFeatures.length,
            districts: this.districtFeatures.length,
            communes: this.communeFeatures.length,
            total: this.provinceFeatures.length + this.districtFeatures.length + this.communeFeatures.length,
            levels: ["province", "district", "commune"],
            bbox: this.overallBbox,
            isLoaded: this.isInitialized,
            source: "Department of Geography, Ministry of Land Management, Urban Planning and Construction / MEF Open Data",
        };
    }

    /**
     * Get pre-serialized static response JSON string for fast cache hits
     */
    public getPreSerialized(key: string): string | undefined {
        return this.preSerializedCache.get(key);
    }

    public setPreSerialized(key: string, json: string): void {
        this.preSerializedCache.set(key, json);
    }
}
