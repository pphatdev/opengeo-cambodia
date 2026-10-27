import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdminItem } from "../types/admin.js";
import { DEFAULT_PROVINCE_COORDINATES } from "../data/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

export function updateProvincesFromCsv(): {
    success: boolean;
    totalParsed: number;
    added: number;
    updated: number;
    unmodified: number;
    removed: number;
    diffs: Array<{ code: string; type: string; before?: any; after?: any }>;
} {
    const dataDir = path.resolve(__dirname, "..", "data");
    const seedDir = path.join(dataDir, "seed");
    const csvPath = path.join(dataDir, "CambodiaProvinceList.csv");
    const seedProvincesPath = path.join(seedDir, "provinces.json");

    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }

    // Read existing provinces.json to preserve coordinates if set
    const existingMap = new Map<string, AdminItem>();
    if (fs.existsSync(seedProvincesPath)) {
        const existing: AdminItem[] = JSON.parse(
            fs.readFileSync(seedProvincesPath, "utf-8"),
        );
        for (const p of existing) {
            if (p.code) existingMap.set(p.code, p);
        }
    }

    const raw = fs.readFileSync(csvPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

    // Header: province_code,province_kh,province_en
    const startIndex = lines[0].toLowerCase().includes("province_code") ? 1 : 0;

    const newProvinces: AdminItem[] = [];
    const seenCodes = new Set<string>();

    const diffs: Array<
        { code: string; type: string; before?: any; after?: any }
    > = [];
    let added = 0;
    let updated = 0;
    let unmodified = 0;

    for (let i = startIndex; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;

        const pCode = cols[0].trim();
        const pKh = cols[1].trim();
        const pEn = cols[2].trim();

        if (!pCode) continue;

        const pId = parseInt(pCode, 10);
        const isCapital = pCode === "12";

        // Get coordinates from existing or default fallback
        const prev = existingMap.get(pCode);
        const coords = DEFAULT_PROVINCE_COORDINATES[pCode];
        const lat = prev?.lat || coords?.lat;
        const lon = prev?.lon || coords?.lon;

        const item: AdminItem = {
            id: pId,
            code: pCode,
            name: pEn,
            name_en: pEn,
            name_km: pKh,
            level: "province",
            lat: lat,
            lon: lon,
            typeKm: isCapital ? "រាជធានី" : "ខេត្ត",
        };

        if (existingMap.has(pCode)) {
            const isChanged = prev!.name !== item.name ||
                prev!.name_en !== item.name_en ||
                prev!.name_km !== item.name_km ||
                prev!.typeKm !== item.typeKm ||
                prev!.lat !== item.lat ||
                prev!.lon !== item.lon;

            if (isChanged) {
                updated++;
                diffs.push({
                    code: pCode,
                    type: "updated",
                    before: {
                        name_km: prev!.name_km,
                        name_en: prev!.name_en,
                        typeKm: prev!.typeKm,
                    },
                    after: {
                        name_km: item.name_km,
                        name_en: item.name_en,
                        typeKm: item.typeKm,
                    },
                });
            } else {
                unmodified++;
            }
        } else {
            added++;
            diffs.push({
                code: pCode,
                type: "added",
                after: {
                    name_km: item.name_km,
                    name_en: item.name_en,
                    typeKm: item.typeKm,
                },
            });
        }

        newProvinces.push(item);
        seenCodes.add(pCode);
    }

    // Check if any existing were removed
    let removed = 0;
    for (const [code, item] of existingMap.entries()) {
        if (!seenCodes.has(code)) {
            removed++;
            diffs.push({
                code: code,
                type: "removed",
                before: {
                    name_km: item.name_km,
                    name_en: item.name_en,
                    typeKm: item.typeKm,
                },
            });
        }
    }

    // Sort strictly by id ascending
    newProvinces.sort((a, b) => a.id - b.id);

    // Write to seed file
    fs.writeFileSync(
        seedProvincesPath,
        JSON.stringify(newProvinces, null, 2),
        "utf-8",
    );

    return {
        success: true,
        totalParsed: newProvinces.length,
        added,
        updated,
        unmodified,
        removed,
        diffs,
    };
}

// CLI direct execution
const isDirectRun = process.argv[1] &&
    (process.argv[1].endsWith("update-provinces.ts") ||
        process.argv[1].endsWith("update-provinces.js"));

if (isDirectRun) {
    console.log("🔄 Updating provinces.json from CambodiaProvinceList.csv...");
    const res = updateProvincesFromCsv();
    console.log(`✅ Update complete!`);
    console.log(`   - Total Provinces: ${res.totalParsed}`);
    console.log(`   - Newly Added:     ${res.added}`);
    console.log(`   - Updated:         ${res.updated}`);
    console.log(`   - Unchanged:       ${res.unmodified}`);
    console.log(`   - Removed:         ${res.removed}`);
    if (res.diffs.length > 0) {
        console.log(`\n📋 First 10 diff entries:`);
        console.log(JSON.stringify(res.diffs.slice(0, 10), null, 2));
    }
}
