import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import type { AdminItem } from '../types/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OverpassElement {
  type: 'relation' | 'way' | 'node';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Overpass ETL Pipeline for Cambodia Administrative Divisions
 * Run with: npm run sync:overpass
 */
async function syncFromOverpass() {
  console.log('🔄 Starting Overpass ETL Pipeline for Cambodia Administrative Divisions...');
  const outputDir = path.resolve(__dirname, '..', 'data', 'synced');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const client = axios.create({
    baseURL: config.overpass.apiUrl,
    timeout: config.overpass.timeoutMs,
    headers: {
      'User-Agent': config.nominatim.userAgent,
    },
  });

  // Overpass QL Query to retrieve Cambodia admin_level 4 (Provinces) and 6 (Districts)
  const qlQuery = `
    [out:json][timeout:90];
    area["ISO3166-1"="KH"][admin_level=2]->.cambodia;
    (
      relation["boundary"="administrative"]["admin_level"="4"](area.cambodia);
      relation["boundary"="administrative"]["admin_level"="6"](area.cambodia);
    );
    out tags center;
  `;

  try {
    console.log('📡 Querying Overpass API for Level 4 & 6 boundaries...');
    const response = await client.post<OverpassResponse>(
      '',
      `data=${encodeURIComponent(qlQuery)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const elements = response.data.elements || [];
    console.log(`📦 Received ${elements.length} administrative elements from Overpass.`);

    const provinces: AdminItem[] = [];
    const districts: AdminItem[] = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const level = tags.admin_level;
      const name = tags.name || tags['name:km'] || tags['name:en'] || 'Unknown';
      const nameEn = tags['name:en'] || tags['name:en_rm'] || tags.int_name || name;
      const nameKm = tags['name:km'] || name;
      const lat = el.center?.lat || el.lat;
      const lon = el.center?.lon || el.lon;

      if (level === '4') {
        provinces.push({
          id: el.id,
          name,
          name_en: nameEn,
          name_km: nameKm,
          level: 'province',
          lat,
          lon,
          code: tags['ref:NCDD'] || tags.ref,
        });
      } else if (level === '6') {
        districts.push({
          id: el.id,
          name,
          name_en: nameEn,
          name_km: nameKm,
          level: 'district',
          lat,
          lon,
          code: tags['ref:NCDD'] || tags.ref,
        });
      }
    }

    console.log(`✅ Extracted ${provinces.length} provinces and ${districts.length} districts.`);

    // Read existing communes and villages from seed if not full synced
    const seedDir = path.resolve(__dirname, '..', 'data', 'seed');
    const existingCommunes = JSON.parse(
      fs.readFileSync(path.join(seedDir, 'communes.json'), 'utf-8')
    );
    const existingVillages = JSON.parse(
      fs.readFileSync(path.join(seedDir, 'villages.json'), 'utf-8')
    );

    fs.writeFileSync(path.join(outputDir, 'provinces.json'), JSON.stringify(provinces, null, 2));
    fs.writeFileSync(path.join(outputDir, 'districts.json'), JSON.stringify(districts, null, 2));
    fs.writeFileSync(path.join(outputDir, 'communes.json'), JSON.stringify(existingCommunes, null, 2));
    fs.writeFileSync(path.join(outputDir, 'villages.json'), JSON.stringify(existingVillages, null, 2));
    fs.writeFileSync(
      path.join(outputDir, 'meta.json'),
      JSON.stringify(
        {
          lastSyncAt: new Date().toISOString(),
          source: 'Overpass API',
          provincesCount: provinces.length,
          districtsCount: districts.length,
        },
        null,
        2
      )
    );

    console.log(`💾 Saved updated datasets to: ${outputDir}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Overpass API error:', error.response?.status, error.message);
    } else {
      console.error('❌ Unexpected error running Overpass ETL:', error);
    }
  }
}

syncFromOverpass();
