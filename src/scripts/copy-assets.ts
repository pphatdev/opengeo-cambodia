import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root is two levels up from src/scripts or dist/scripts
const rootDir = path.resolve(__dirname, '..', '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

function copyDir(src: string, dest: string) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`📁 Copied ${path.relative(rootDir, src)} -> ${path.relative(rootDir, dest)}`);
  }
}

console.log('📦 Copying non-TypeScript assets to dist/ ...');

// 1. Copy UI Views (demo.html)
copyDir(path.join(srcDir, 'views'), path.join(distDir, 'views'));

// 2. Copy Seed Data (JSON)
copyDir(path.join(srcDir, 'data', 'seed'), path.join(distDir, 'data', 'seed'));

// 3. Copy Synced Data if exists
if (fs.existsSync(path.join(srcDir, 'data', 'synced'))) {
  copyDir(path.join(srcDir, 'data', 'synced'), path.join(distDir, 'data', 'synced'));
}

// 4. Copy 4 Official CSV datasets
const csvFiles = [
  'CambodiaProvinceList.csv',
  'CambodiaDistrictList.csv',
  'CambodiaCommuneList.csv',
  'CambodiaVillagesList.csv',
];
for (const csv of csvFiles) {
  const src = path.join(srcDir, 'data', csv);
  const dest = path.join(distDir, 'data', csv);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`📄 Copied ${path.relative(rootDir, src)} -> ${path.relative(rootDir, dest)}`);
  }
}

console.log('✅ Assets successfully copied to dist/!');
