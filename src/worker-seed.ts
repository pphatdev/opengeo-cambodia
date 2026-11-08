/// <reference path="./types/geojson.d.ts" />

/**
 * Bundles the canonical seed JSON (public/data/seed) into the Cloudflare Worker
 * and registers it with AdminStore. The Worker has no filesystem, so the data
 * must be imported at build time.
 *
 * Must be the FIRST import in worker.ts so the seed is registered before any
 * module calls AdminStore.getInstance().
 *
 * Excluded from the Node tsc build (tsconfig.json rootDir is ./src); it is
 * type-checked via tsconfig.worker.json and bundled by wrangler.
 */
import { AdminStore } from "./data/store.js";
import { BoundariesService } from "./services/boundaries.service.js";
import type { AdminItem } from "./types/admin.js";
import provinces from "../public/data/seed/provinces.json" with { type: "json" };
import districts from "../public/data/seed/districts.json" with { type: "json" };
import communes from "../public/data/seed/communes.json" with { type: "json" };
import villages from "../public/data/seed/villages.json" with { type: "json" };
import provincesGeoJson from "../public/boundaries/province.geojson" with { type: "json" };
import districtsGeoJson from "../public/boundaries/district.geojson" with { type: "json" };
import communesGeoJson from "../public/boundaries/commune.geojson" with { type: "json" };

AdminStore.registerSeed({
    provinces: provinces as AdminItem[],
    districts: districts as AdminItem[],
    communes: communes as AdminItem[],
    villages: villages as AdminItem[],
});

BoundariesService.registerSeed({
    provinces: provincesGeoJson as any,
    districts: districtsGeoJson as any,
    communes: communesGeoJson as any,
});
