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

export function updateCommunesFromCsv(): {
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
    const csvPath = path.join(dataDir, "CambodiaCommuneList.csv");
    const seedCommunesPath = path.join(seedDir, "communes.json");
    const seedDistrictsPath = path.join(seedDir, "districts.json");

    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }

    // Read districts to determine typeKm (Sangkat vs Khum)
    const districtMap = new Map<string, AdminItem>();
    if (fs.existsSync(seedDistrictsPath)) {
        const districts: AdminItem[] = JSON.parse(
            fs.readFileSync(seedDistrictsPath, "utf-8"),
        );
        for (const d of districts) {
            if (d.code) districtMap.set(d.code, d);
            districtMap.set(String(d.id), d);
        }
    }

    // Read existing communes.json
    const existingMap = new Map<string, AdminItem>();
    if (fs.existsSync(seedCommunesPath)) {
        const existing: AdminItem[] = JSON.parse(
            fs.readFileSync(seedCommunesPath, "utf-8"),
        );
        for (const c of existing) {
            if (c.code) existingMap.set(c.code, c);
        }
    }

    const raw = fs.readFileSync(csvPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

    // Expect header: province_code,district_code,commune_code,commune_kh,commune_en
    const startIndex = lines[0].toLowerCase().includes("commune_code") ? 1 : 0;

    const newCommunes: AdminItem[] = [];
    const seenCodes = new Set<string>();

    const diffs: Array<
        { code: string; type: string; before?: any; after?: any }
    > = [];
    let added = 0;
    let updated = 0;
    let unmodified = 0;

    for (let i = startIndex; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 5) continue;

        const pCode = cols[0].trim();
        const dCode = cols[1].trim();
        const cCode = cols[2].trim();
        const cKh = cols[3].trim();
        const cEn = cols[4].trim();

        if (!cCode) continue;

        const cId = parseInt(cCode, 10);
        const dId = parseInt(dCode, 10);

        // Determine typeKm
        const district = districtMap.get(dCode) || districtMap.get(String(dId));
        const isKhan = pCode === "12" || (district && district.typeKm === "ខណ្ឌ");
        const isKrong = KRONG_CODES.has(dCode) ||
            (district && district.typeKm === "ក្រុង");
        const typeKm = isKhan || isKrong ? "សង្កាត់" : "ឃុំ";

        const item: AdminItem = {
            id: cId,
            code: cCode,
            parentId: dId,
            name: cEn,
            name_en: cEn,
            name_km: cKh,
            level: "commune",
            typeKm: typeKm,
        };

        if (existingMap.has(cCode)) {
            const prev = existingMap.get(cCode)!;
            const isChanged = prev.name !== item.name ||
                prev.name_en !== item.name_en ||
                prev.name_km !== item.name_km ||
                prev.parentId !== item.parentId ||
                prev.typeKm !== item.typeKm;

            if (isChanged) {
                updated++;
                diffs.push({
                    code: cCode,
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
                code: cCode,
                type: "added",
                after: {
                    name_km: item.name_km,
                    name_en: item.name_en,
                    typeKm: item.typeKm,
                    parentId: item.parentId,
                },
            });
        }

        newCommunes.push(item);
        seenCodes.add(cCode);
    }

    // Check if any existing communes in communes.json were not in CSV
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
    newCommunes.sort((a, b) => a.id - b.id);

    // Write to seed file
    fs.writeFileSync(
        seedCommunesPath,
        JSON.stringify(newCommunes, null, 2),
        "utf-8",
    );

    return {
        success: true,
        totalParsed: newCommunes.length,
        added,
        updated,
        unmodified,
        removed,
        diffs,
    };
}

// CLI direct execution
const isDirectRun = process.argv[1] &&
    (process.argv[1].endsWith("update-communes.ts") ||
        process.argv[1].endsWith("update-communes.js"));

if (isDirectRun) {
    console.log("🔄 Updating communes.json from CambodiaCommuneList.csv...");
    const res = updateCommunesFromCsv();
    console.log(`✅ Update complete!`);
    console.log(`   - Total Communes: ${res.totalParsed}`);
    console.log(`   - Newly Added:    ${res.added}`);
    console.log(`   - Updated:        ${res.updated}`);
    console.log(`   - Unchanged:      ${res.unmodified}`);
    console.log(`   - Removed:        ${res.removed}`);
    if (res.diffs.length > 0) {
        console.log(`\n📋 First 10 diff entries:`);
        console.log(JSON.stringify(res.diffs.slice(0, 10), null, 2));
    }
}
