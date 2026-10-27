import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root is two levels up from src/scripts or dist/scripts
const rootDir = path.resolve(__dirname, "..", "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");

function copyDir(src: string, dest: string) {
    if (fs.existsSync(src)) {
        fs.mkdirSync(dest, { recursive: true });
        fs.cpSync(src, dest, { recursive: true });
        console.log(
            `📁 Copied ${path.relative(rootDir, src)} -> ${
                path.relative(rootDir, dest)
            }`,
        );
    }
}

console.log("📦 Copying non-TypeScript assets to dist/ ...");

// 1. Copy Seed Data (JSON)
copyDir(path.join(srcDir, "data", "seed"), path.join(distDir, "data", "seed"));

// 2. Copy HTML Views
copyDir(path.join(srcDir, "views"), path.join(distDir, "views"));

// 3. Copy Synced Data if exists
if (fs.existsSync(path.join(srcDir, "data", "synced"))) {
    copyDir(
        path.join(srcDir, "data", "synced"),
        path.join(distDir, "data", "synced"),
    );
}

// 4. Copy 4 Official CSV datasets
const csvFiles = [
    "CambodiaProvinceList.csv",
    "CambodiaDistrictList.csv",
    "CambodiaCommuneList.csv",
    "CambodiaVillagesList.csv",
];
for (const csv of csvFiles) {
    const src = path.join(srcDir, "data", csv);
    const dest = path.join(distDir, "data", csv);
    if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        console.log(
            `📄 Copied ${path.relative(rootDir, src)} -> ${
                path.relative(rootDir, dest)
            }`,
        );
    }
}

// 5. Copy LLM documentation files
const llmFiles = ["llms.txt", "llms-full.txt"];
for (const file of llmFiles) {
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(
            `📄 Copied ${path.relative(rootDir, src)} -> ${
                path.relative(rootDir, dest)
            }`,
        );
    }
}

// 6. Ensure Public Assets & Logos are synchronized and copied to dist/public
const publicSrcDir = path.join(rootDir, "public");
const publicDistDir = path.join(distDir, "public");

// Auto-sync reference logo directory if public/logo doesn't have it yet
const khmerDatetimeLogoDir = path.resolve(
    rootDir,
    "..",
    "..",
    "labs",
    "libs",
    "kfe",
    "khmer-datetime.pphat.me",
    "public",
    "logo",
);
const localLogoDir = path.join(publicSrcDir, "logo");
if (!fs.existsSync(localLogoDir) && fs.existsSync(khmerDatetimeLogoDir)) {
    try {
        fs.mkdirSync(localLogoDir, { recursive: true });
        fs.cpSync(khmerDatetimeLogoDir, localLogoDir, { recursive: true });
        console.log(
            `🖼️ Synced reference logo assets from khmer-datetime to ${path.relative(
                rootDir,
                localLogoDir,
            )}`,
        );
    } catch (e) {
        console.warn("⚠️ Could not auto-sync reference logo assets:", e);
    }
}

// Copy public/ -> dist/public
copyDir(publicSrcDir, publicDistDir);

console.log("✅ Assets successfully copied to dist/!");

