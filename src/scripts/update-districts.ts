import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdminItem } from "../types/admin.js";
import { KRONG_CODES } from "../data/store.js";

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

export function updateDistrictsFromCsv(): {
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
    const csvPath = path.join(dataDir, "CambodiaDistrictList.csv");
    const seedDistrictsPath = path.join(seedDir, "districts.json");

    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }

    // Read existing districts.json
    const existingMap = new Map<string, AdminItem>();
    if (fs.existsSync(seedDistrictsPath)) {
        const existing: AdminItem[] = JSON.parse(
            fs.readFileSync(seedDistrictsPath, "utf-8"),
        );
        for (const d of existing) {
            if (d.code) existingMap.set(d.code, d);
        }
    }

    const raw = fs.readFileSync(csvPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

    // Header: province_code,district_code,district_kh,district_en
    const startIndex = lines[0].toLowerCase().includes("district_code") ? 1 : 0;

    const newDistricts: AdminItem[] = [];
    const seenCodes = new Set<string>();

    const diffs: Array<
        { code: string; type: string; before?: any; after?: any }
    > = [];
    let added = 0;
    let updated = 0;
    let unmodified = 0;

    for (let i = startIndex; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 4) continue;

        const pCode = cols[0].trim();
        const dCode = cols[1].trim();
        const dKh = cols[2].trim();
        const dEn = cols[3].trim();

        if (!dCode) continue;

        const pId = parseInt(pCode, 10);
        const dId = parseInt(dCode, 10);

        const isKhan = pCode === "12";
        const isKrong = KRONG_CODES.has(dCode) ||
            dEn.toLowerCase().startsWith("krong ") ||
            dKh.startsWith("ក្រុង");

        const typeKm = isKhan ? "ខណ្ឌ" : isKrong ? "ក្រុង" : "ស្រុក";

        const item: AdminItem = {
            id: dId,
            code: dCode,
            parentId: pId,
            name: dEn,
            name_en: dEn,
            name_km: dKh,
            level: "district",
            typeKm: typeKm,
        };

        if (existingMap.has(dCode)) {
            const prev = existingMap.get(dCode)!;
            const isChanged = prev.name !== item.name ||
                prev.name_en !== item.name_en ||
                prev.name_km !== item.name_km ||
                prev.parentId !== item.parentId ||
                prev.typeKm !== item.typeKm;

            if (isChanged) {
                updated++;
                diffs.push({
                    code: dCode,
                    type: "updated",
                    before: {
                        name_km: prev.name_km,
                        name_en: prev.name_en,
                        typeKm: prev.typeKm,
                        parentId: prev.parentId,
                    },
                    after: {
                        name_km: item.name_km,
                        name_en: item.name_en,
                        typeKm: item.typeKm,
                        parentId: item.parentId,
                    },
                });
            } else {
                unmodified++;
            }
        } else {
            added++;
            diffs.push({
                code: dCode,
                type: "added",
                after: {
                    name_km: item.name_km,
                    name_en: item.name_en,
                    typeKm: item.typeKm,
                    parentId: item.parentId,
                },
            });
        }

        newDistricts.push(item);
        seenCodes.add(dCode);
    }

    // Check if any existing districts were removed
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
    newDistricts.sort((a, b) => a.id - b.id);

    // Write to seed file
    fs.writeFileSync(
        seedDistrictsPath,
        JSON.stringify(newDistricts, null, 2),
        "utf-8",
    );

    return {
        success: true,
        totalParsed: newDistricts.length,
        added,
        updated,
        unmodified,
        removed,
        diffs,
    };
}

// CLI direct execution
const isDirectRun = process.argv[1] &&
    (process.argv[1].endsWith("update-districts.ts") ||
        process.argv[1].endsWith("update-districts.js"));

if (isDirectRun) {
    console.log("🔄 Updating districts.json from CambodiaDistrictList.csv...");
    const res = updateDistrictsFromCsv();
    console.log(`✅ Update complete!`);
    console.log(`   - Total Districts: ${res.totalParsed}`);
    console.log(`   - Newly Added:    ${res.added}`);
    console.log(`   - Updated:        ${res.updated}`);
    console.log(`   - Unchanged:      ${res.unmodified}`);
    console.log(`   - Removed:        ${res.removed}`);
    if (res.diffs.length > 0) {
        console.log(`\n📋 First 10 diff entries:`);
        console.log(JSON.stringify(res.diffs.slice(0, 10), null, 2));
    }
}
