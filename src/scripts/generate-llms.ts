import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdminStore } from "../data/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const distDir = path.join(rootDir, "dist");

interface Stats {
    provinces: number;
    districts: number;
    communes: number;
    villages: number;
    lastSyncAt?: string | null;
}

function getStats(): Stats {
    try {
        const store = AdminStore.getInstance();
        const s = store.getStats();
        if (s && s.provinces > 0) return s;
    } catch (err) {
        console.warn(
            "⚠️ Could not load live AdminStore stats, using defaults:",
            err,
        );
    }
    return {
        provinces: 25,
        districts: 210,
        communes: 1661,
        villages: 14576,
        lastSyncAt: new Date().toISOString(),
    };
}

export function generateLlmsTxt(stats: Stats): string {
    const p = stats.provinces.toLocaleString();
    const d = stats.districts.toLocaleString();
    const c = stats.communes.toLocaleString();
    const v = stats.villages.toLocaleString();

    return `# OpenGeo Cambodia API

> An Open API for Cambodia geography data providing complete 4-tier administrative hierarchy (Provinces, Districts, Communes, Villages), 100% free to use, with ultra-fast sub-millisecond response times.

## Project Purpose & Core Pillars

OpenGeo Cambodia is an open API dedicated to standardizing and distributing Cambodian geographic data based on three foundational principles:
1. **Complete Administrative Hierarchy**: Full authoritative resolution across all 4 official tiers: ${p} Provinces (រាជធានី / ខេត្ត), ${d} Districts (ស្រុក / ខណ្ឌ / ក្រុង), ${c} Communes (ឃុំ / សង្កាត់), and ${v} Villages (ភូមិ).
2. **100% Free & Open Access**: Zero barrier to entry. No API keys, no subscriptions, no paywalls, unrestricted commercial and non-commercial usage under the MIT license.
3. **Ultra-Fast Response Times (Sub-1ms)**: Pre-indexed in-memory O(1) hash maps and edge caching provide cascading lookups and geocoding in under 1 millisecond.

- **Base URL**: \`https://opengeo-cambodia.pphat.me\` (or \`http://localhost:3000\` locally)
- **Interactive Web UI**: \`https://opengeo-cambodia.pphat.me/demo\`
- **Full LLM Reference**: [llms-full.txt](https://opengeo-cambodia.pphat.me/llms-full.txt)
- **API Spec & Metadata**: \`GET /api/info\`
- **Health Check**: \`GET /health\`
- **Rate Limits**: 120 requests/min for \`/api/admin/*\`, 30 requests/min for \`/api/geocode/*\` (IP-based, standard \`X-RateLimit-*\` headers)
- **Data Latency**: Sub-1ms for in-memory administrative lookups; ~100-300ms for Nominatim OSM reverse geocoding

## Administrative Hierarchy (4 Tiers)

| Tier | Cambodian Name (KM) | Latin Romanization | Total Count | Standard Code Length |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Province** | រាជធានី / ខេត្ត | Reachdhanie / Khaet | **${p}** (1 Capital + 24 Provinces) | 2 digits (e.g. \`12\`) |
| **Tier 2: District** | ស្រុក / ខណ្ឌ / ក្រុង | Srok / Khan / Krong | **${d}** (14 Khans + 32 Krongs + 164 Sroks) | 4 digits (e.g. \`1202\`) |
| **Tier 3: Commune** | ឃុំ / សង្កាត់ | Khum / Sangkat | **${c}** | 6 digits (e.g. \`120201\`) |
| **Tier 4: Village** | ភូមិ | Phum (Village) | **${v}** | 8 digits (e.g. \`12020101\`) |

## Quick API Reference

### Administrative Lookups (In-Memory, < 1ms)
- \`GET /api/admin/provinces\`: List all ${p} provinces/capital with Khmer & English names, coordinates, and codes.
- \`GET /api/admin/provinces/:id/districts\`: List all districts / khans / krongs within a province (e.g. \`:id\` = \`12\` for Phnom Penh).
- \`GET /api/admin/districts/:id/communes\`: List all communes / sangkats within a district (e.g. \`:id\` = \`1202\` for Doun Penh).
- \`GET /api/admin/communes/:id/villages\`: List all villages within a commune (e.g. \`:id\` = \`120201\` for Phsar Thmei 1).
- \`GET /api/admin/item/:id\`: Fetch a single administrative record by numeric ID.
- \`GET /api/admin/hierarchy/:id\`: Resolves the complete ascending 4-tier tree (Province -> District -> Commune -> Village) for any division ID.
- \`GET /api/admin/search?q=:query&level=:level&limit=:limit\`: Sub-millisecond full-text search across Khmer script and Latin romanizations.
- \`GET /api/admin/stats\`: Summary counts of loaded administrative units (${p} provinces, ${d} districts, ${c} communes, ${v} villages).

### Smart Geocoding (OSM & Nominatim)
- \`GET /api/geocode/reverse?lat=:lat&lon=:lon\`: Reverse geocode a GPS coordinate into the standardized 4-tier Cambodian address model.
- \`GET /api/geocode/search?q=:query&limit=:limit\`: Free-text geocoding search bounded to Cambodia territory.

### Geographic Boundaries (GeoJSON & GIS Integration)
- \`GET /api/boundaries?level=:level&province_code=:pCode&district_code=:dCode&q=:query&format=:format\`: Unified Boundaries API with spatial filtering, search, pagination, and format selection (\`geojson\` or \`summary\`).
- \`GET /api/boundaries/provinces\`: All 25 province boundary GeoJSON polygons with official Khmer script names and pre-calculated bounding boxes.
- \`GET /api/boundaries/districts?province_code=:pCode\`: District boundaries (filterable by province).
- \`GET /api/boundaries/communes?district_code=:dCode\`: Commune boundaries (filterable by district or province).
- \`GET /api/boundaries/item/:code\`: Single boundary GeoJSON Feature by code (e.g. \`12\` or \`KH12\`).
- \`GET /api/boundaries/hierarchy/:code\`: Ascending nested boundary polygons (Commune -> District -> Province).
- \`GET /api/boundaries/stats\`: Boundary feature counts, bounds, and metadata.
- \`GET /api/boundaries/raw/:filename\`: Direct download for \`provinces.geojson\`, \`districts.geojson\`, and \`communes.geojson\`.

## Common Code Patterns

### 1. Fetch Provinces & Districts (TypeScript / Fetch)
\`\`\`ts
const API_BASE = 'https://opengeo-cambodia.pphat.me';

// 1. Get all provinces
const provinces = await fetch(\`\${API_BASE}/api/admin/provinces\`).then(r => r.json());

// 2. Get districts for Phnom Penh (ID: 12)
const districts = await fetch(\`\${API_BASE}/api/admin/provinces/12/districts\`).then(r => r.json());
\`\`\`

### 2. Reverse Geocode GPS to Cambodian Address (Python)
\`\`\`python
import requests

res = requests.get('https://opengeo-cambodia.pphat.me/api/geocode/reverse', params={
    'lat': 11.5564,
    'lon': 104.9282
}).json()

print(res['data']['displayName'])
# Output: Doun Penh, Phnom Penh, 120201, Cambodia
\`\`\`

## Detailed Documentation
- [Full LLM Specification & Schemas](https://opengeo-cambodia.pphat.me/llms-full.txt): Comprehensive schemas, status codes, gotchas, and complete TypeScript/Python SDK integration patterns.
- [Interactive Web Playground](https://opengeo-cambodia.pphat.me/demo): Live testing interface with tree cascading selector, boundary GeoJSON polygon visualizer, interactive Leaflet map, and address search.
- [GitHub Repository](https://github.com/pphatdev/opengeo-cambodia): Open-source source code, Overpass QL sync scripts, and CSV update utilities.
`;
}

export function generateLlmsFullTxt(stats: Stats): string {
    const p = stats.provinces.toLocaleString();
    const d = stats.districts.toLocaleString();
    const c = stats.communes.toLocaleString();
    const v = stats.villages.toLocaleString();
    const lastSync = stats.lastSyncAt || new Date().toISOString();

    return `# OpenGeo Cambodia API - Full LLM & Agent Documentation

> An Open API for Cambodia geography data providing complete 4-tier administrative hierarchy (Provinces, Districts, Communes, Villages), 100% free to use, with ultra-fast sub-millisecond response times.
> Comprehensive developer and AI agent reference manual for the OpenGeo Cambodia REST API.

---

## 1. Project Purpose & Core Capabilities

OpenGeo Cambodia is an open API built specifically for Cambodia's geography and administrative divisions. Its mission is defined by three core pillars:

1. **Complete Administrative Hierarchy**: Full, authoritative coverage of all 4 official tiers: **${p} Provinces & Capital**, **${d} Districts, Khans & Krongs**, **${c} Communes & Sangkats**, and **${v} Villages**.
2. **Allow Users to Use for Free**: 100% free, public, and open access for everyone. No API keys, no paywalls, zero usage costs, and fully MIT-licensed for commercial and non-commercial systems.
3. **Provide Fast Response Time**: Ultra-low latency sub-millisecond ($< 1\\text{ms}$) in-memory lookups powered by O(1) hash map indices and edge caching without database bottlenecks.

### Primary Architecture
1. **In-Memory Administrative Store (\`AdminStore\`)**:
   - Contains all official Cambodian administrative divisions: **${p} Provinces**, **${d} Districts**, **${c} Communes**, and **${v} Villages**.
   - Sub-millisecond ($< 1\\text{ms}$) response times served directly from memory indices without external network dependencies.
   - Dual-language support: Official Khmer script (\`name_km\`) and Latin Romanization (\`name_en\`).
2. **Normalized Smart Geocoding (\`GeocodeService\`)**:
   - Reverse geocodes GPS coordinates (\`lat\`, \`lon\`) through OpenStreetMap Nominatim.
   - Normalizes varied OSM tagging conventions (\`admin_level\`, \`suburb\`, \`quarter\`, \`municipality\`, \`county\`) into Cambodia's strict 4-tier administrative hierarchy.

---

## 2. Cambodian Administrative Hierarchy Model

Cambodia's official administrative structure adheres to four distinct levels:

| Tier | Level Name | Cambodian (KM) | Latin Romanization | Count | Code Format | Hierarchy Example |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Province / Capital | រាជធានី / ខេត្ត | Reachdhanie / Khaet | **${p}** | 2 digits (\`12\`) | Phnom Penh (\`12\`) |
| **Tier 2** | District / Khan / Krong | ស្រុក / ខណ្ឌ / ក្រុង | Srok / Khan / Krong | **${d}** | 4 digits (\`1202\`) | Doun Penh (\`1202\`) |
| **Tier 3** | Commune / Sangkat | ឃុំ / សង្កាត់ | Khum / Sangkat | **${c}** | 6 digits (\`120201\`) | Phsar Thmei 1 (\`120201\`) |
| **Tier 4** | Village | ភូមិ | Phum | **${v}** | 8 digits (\`12020101\`) | Phum 1 (\`12020101\`) |

### Key Domain Rules
1. **ID Hierarchical Prefix Inheritance**:
   - A District's 4-digit code starts with its parent Province's 2-digit code (e.g., Province \`12\` -> District \`1202\`).
   - A Commune's 6-digit code starts with its parent District's 4-digit code (e.g., District \`1202\` -> Commune \`120201\`).
   - A Village's 8-digit code starts with its parent Commune's 6-digit code (e.g., Commune \`120201\` -> Village \`12020101\`).
2. **Administrative Types**:
   - **Capital (រាជធានី)**: Phnom Penh (single capital).
   - **Provinces (ខេត្ត)**: 24 provinces (e.g., Siem Reap, Kandal, Battambang, Kampot).
   - **Khan (ខណ្ឌ)**: Urban municipal subdivisions inside Phnom Penh (14 Khans).
   - **Krong (ក្រុង)**: Urban municipal cities outside Phnom Penh (32 Krongs, e.g., Krong Siem Reap).
   - **Srok (ស្រុក)**: Rural districts (164 Sroks).
   - **Sangkat (សង្កាត់)**: Urban communes inside Khans and Krongs.
   - **Khum (ឃុំ)**: Rural communes inside Sroks.
   - **Phum (ភូមិ)**: Villages (the smallest administrative unit).

---

## 3. Network & Connection Details

- **Production Base URL**: \`https://opengeo-cambodia.pphat.me\`
- **Local Development URL**: \`http://localhost:3000\`
- **Default Port**: \`3000\`
- **Protocols**: HTTPS (HTTP/1.1 and HTTP/2 supported)
- **CORS**: \`Access-Control-Allow-Origin: *\` enabled for all origins with \`GET\` and \`OPTIONS\`
- **ETag Support**: Generates standard HTTP \`ETag\` headers. Clients can pass \`If-None-Match\` to receive \`304 Not Modified\`
- **Rate Limits**:
  - Administrative routes (\`/api/admin/*\`): \`120\` requests per minute per IP.
  - Geocoding routes (\`/api/geocode/*\`): \`30\` requests per minute per IP.
  - Response headers include: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`, \`Retry-After\`.

---

## 4. Complete REST API Endpoint Reference

### 4.1. List All Provinces
Returns all ${p} provinces and the capital city of Cambodia.

- **Method**: \`GET\`
- **Path**: \`/api/admin/provinces\`
- **Query Parameters**: None
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "code": "12",
      "name": "Phnom Penh",
      "name_en": "Phnom Penh",
      "name_km": "រាជធានីភ្នំពេញ",
      "typeKm": "រាជធានី",
      "level": "province",
      "lat": 11.5564,
      "lon": 104.9282
    }
  ],
  "meta": {
    "total": ${stats.provinces},
    "timestamp": "${lastSync}",
    "source": "local_cache"
  }
}
\`\`\`

---

### 4.2. List Districts within a Province
Returns all districts, khans, or krongs belonging to a specific province.

- **Method**: \`GET\`
- **Path**: \`/api/admin/provinces/:id/districts\`
- **Path Parameters**:
  - \`id\` (integer, required): Province ID (e.g. \`12\` for Phnom Penh, \`17\` for Siem Reap).
- **Validation**: \`:id\` must be a positive integer ($1-9$ digits).
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1202,
      "code": "1202",
      "parentId": 12,
      "name": "Doun Penh",
      "name_en": "Doun Penh",
      "name_km": "ខណ្ឌដូនពេញ",
      "typeKm": "ខណ្ឌ",
      "level": "district"
    }
  ],
  "meta": {
    "total": 14,
    "timestamp": "${lastSync}",
    "source": "local_cache"
  }
}
\`\`\`

---

### 4.3. List Communes within a District
Returns all communes or sangkats belonging to a specific district.

- **Method**: \`GET\`
- **Path**: \`/api/admin/districts/:id/communes\`
- **Path Parameters**:
  - \`id\` (integer, required): District ID (e.g. \`1202\` for Doun Penh).
- **Validation**: \`:id\` must be a positive integer ($1-9$ digits).
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 120201,
      "code": "120201",
      "parentId": 1202,
      "name": "Phsar Thmei 1",
      "name_en": "Phsar Thmei 1",
      "name_km": "សង្កាត់ផ្សារថ្មីទី១",
      "typeKm": "សង្កាត់",
      "level": "commune"
    }
  ],
  "meta": {
    "total": 11,
    "timestamp": "${lastSync}",
    "source": "local_cache"
  }
}
\`\`\`

---

### 4.4. List Villages within a Commune
Returns all villages (phums) belonging to a specific commune.

- **Method**: \`GET\`
- **Path**: \`/api/admin/communes/:id/villages\`
- **Path Parameters**:
  - \`id\` (integer, required): Commune ID (e.g. \`120201\` for Phsar Thmei 1).
- **Validation**: \`:id\` must be a positive integer ($1-9$ digits).
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 12020101,
      "code": "12020101",
      "parentId": 120201,
      "name": "Phum 1",
      "name_en": "Phum 1",
      "name_km": "ភូមិ១",
      "typeKm": "ភូមិ",
      "level": "village"
    }
  ],
  "meta": {
    "total": 3,
    "timestamp": "${lastSync}",
    "source": "local_cache"
  }
}
\`\`\`

---

### 4.5. Single Item Lookup by ID
Retrieves details of any single administrative division by its ID.

- **Method**: \`GET\`
- **Path**: \`/api/admin/item/:id\`
- **Path Parameters**:
  - \`id\` (integer, required): Administrative division ID.
- **Response Format (200 OK)**:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 1202,
    "code": "1202",
    "parentId": 12,
    "name": "Doun Penh",
    "name_en": "Doun Penh",
    "name_km": "ខណ្ឌដូនពេញ",
    "typeKm": "ខណ្ឌ",
    "level": "district"
  }
}
\`\`\`

---

### 4.6. Resolve Ascending Hierarchy Tree
Given any division ID (e.g., a village ID or commune ID), returns the complete ascending hierarchy: Province -> District -> Commune -> Village.

- **Method**: \`GET\`
- **Path**: \`/api/admin/hierarchy/:id\`
- **Path Parameters**:
  - \`id\` (integer, required): Any administrative division ID.
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": {
    "province": {
      "id": 12,
      "code": "12",
      "name": "Phnom Penh",
      "name_en": "Phnom Penh",
      "name_km": "រាជធានីភ្នំពេញ",
      "level": "province"
    },
    "district": {
      "id": 1202,
      "code": "1202",
      "name": "Doun Penh",
      "name_en": "Doun Penh",
      "name_km": "ខណ្ឌដូនពេញ",
      "level": "district"
    },
    "commune": {
      "id": 120201,
      "code": "120201",
      "name": "Phsar Thmei 1",
      "name_en": "Phsar Thmei 1",
      "name_km": "សង្កាត់ផ្សារថ្មីទី១",
      "level": "commune"
    },
    "village": {
      "id": 12020101,
      "code": "12020101",
      "name": "Phum 1",
      "name_en": "Phum 1",
      "name_km": "ភូមិ១",
      "level": "village"
    }
  }
}
\`\`\`

---

### 4.7. Fast In-Memory Administrative Search
Performs instant text search across Khmer script, Latin romanizations, and division IDs.

- **Method**: \`GET\`
- **Path**: \`/api/admin/search\`
- **Query Parameters**:
  - \`q\` (string, required): Search query string (maximum 100 characters).
  - \`level\` (string, optional): Filter by tier (\`province\`, \`district\`, \`commune\`, \`village\`).
  - \`limit\` (integer, optional): Maximum results ($1-100$, default: \`20\`).
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 1202,
      "name_en": "Doun Penh",
      "name_km": "ខណ្ឌដូនពេញ",
      "level": "district",
      "parentId": 12
    }
  ],
  "meta": {
    "total": 1,
    "timestamp": "${lastSync}",
    "source": "local_cache"
  }
}
\`\`\`

---

### 4.8. Summary Statistics
Returns the record counts of all loaded administrative divisions.

- **Method**: \`GET\`
- **Path**: \`/api/admin/stats\`
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": {
    "provinces": ${stats.provinces},
    "districts": ${stats.districts},
    "communes": ${stats.communes},
    "villages": ${stats.villages},
    "lastSyncAt": "${lastSync}"
  }
}
\`\`\`

---

### 4.9. Reverse Geocode (GPS to Cambodian Address)
Converts latitude and longitude into normalized Cambodian administrative components.

- **Method**: \`GET\`
- **Path**: \`/api/geocode/reverse\`
- **Query Parameters**:
  - \`lat\` (float, required): Latitude between \`-90.0\` and \`90.0\` (Cambodia is roughly \`10.0\` to \`14.7\`).
  - \`lon\` (float, required): Longitude between \`-180.0\` and \`180.0\` (Cambodia is roughly \`102.3\` to \`107.6\`).
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": {
    "displayName": "Doun Penh, Phnom Penh, 120201, Cambodia",
    "province": "Phnom Penh",
    "district": "Doun Penh",
    "commune": "Voat Phnum",
    "village": null,
    "postcode": "120201",
    "lat": 11.5714,
    "lon": 104.9250,
    "osmId": 1234567,
    "osmType": "relation"
  },
  "meta": {
    "tookMs": 142.5,
    "timestamp": "${lastSync}",
    "source": "nominatim"
  }
}
\`\`\`

---

### 4.10. Free-text Geocoding Search
Performs free-text search bounded strictly to Cambodia's geographical boundaries.

- **Method**: \`GET\`
- **Path**: \`/api/geocode/search\`
- **Query Parameters**:
  - \`q\` (string, required): Place or landmark name (maximum 100 characters).
  - \`limit\` (integer, optional): Maximum results ($1-50$, default: \`10\`).
- **Response Format**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "displayName": "Angkor Wat, Siem Reap, Cambodia",
      "province": "Siem Reap",
      "district": "Siem Reap",
      "commune": "Nokor Thum",
      "village": null,
      "postcode": "171201",
      "lat": 13.4125,
      "lon": 103.8670
    }
  ],
  "meta": {
    "total": 1,
    "tookMs": 180.2,
    "timestamp": "${lastSync}",
    "source": "nominatim"
  }
}
\`\`\`

---

### 4.11. Geographic Boundaries API (GeoJSON & GIS Integration)
Serves official boundary polygons (Provinces, Districts, Communes) as standardized GeoJSON (\`FeatureCollection\` / \`Feature\`) or lightweight metadata lists (\`format=summary\`). Every feature is enriched with Khmer script names (\`name_km\`), NCDD administrative codes (\`code\`), PCODEs (\`pcode\`), administrative types (\`type_km\`), and pre-calculated 2D bounding boxes (\`bbox\`).

#### 4.11.1. Flexible Boundaries Query
- **Method**: \`GET\`
- **Path**: \`/api/boundaries\`
- **Query Parameters**:
  - \`level\` (string, optional): Boundary tier (\`province\`, \`district\`, \`commune\`, default: \`province\`).
  - \`province_code\` (string, optional): Filter by parent province code (e.g. \`12\` or \`KH12\`).
  - \`district_code\` (string, optional): Filter by parent district code (e.g. \`1201\` or \`KH1201\`).
  - \`code\` (string, optional): Exact code match (e.g. \`12\`, \`1201\`, \`120101\`).
  - \`q\` / \`search\` (string, optional): Search query matching English or Khmer script names.
  - \`format\` (string, optional): \`geojson\` (default, returns GeoJSON \`FeatureCollection\`) or \`summary\` / \`list\` (returns lightweight JSON list without heavy coordinates).
  - \`limit\` (integer, optional): Maximum features to return.
  - \`offset\` (integer, optional): Pagination offset.
- **GeoJSON Response Format**:
\`\`\`json
{
  "type": "FeatureCollection",
  "name": "cambodia_province_boundaries",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "bbox": [102.3, 10.4, 107.7, 14.7],
  "features": [
    {
      "type": "Feature",
      "id": 12,
      "properties": {
        "id": 12,
        "code": "12",
        "pcode": "KH12",
        "name": "Phnom Penh",
        "name_en": "Phnom Penh",
        "name_km": "រាជធានីភ្នំពេញ",
        "type_km": "រាជធានី",
        "level": "province",
        "lat": 11.5564,
        "lon": 104.9282,
        "bbox": [104.74, 11.42, 105.04, 11.69],
        "shape_length": 1.95,
        "shape_area": 0.056
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[104.74, 11.42], [105.04, 11.69]]]
      }
    }
  ]
}
\`\`\`

#### 4.11.2. Summary List Format (\`format=summary\`)
When fetching boundaries for UI dropdowns, tables, or map bounds without downloading megabytes of coordinates:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "code": "12",
      "pcode": "KH12",
      "name_en": "Phnom Penh",
      "name_km": "រាជធានីភ្នំពេញ",
      "type_km": "រាជធានី",
      "level": "province",
      "lat": 11.5564,
      "lon": 104.9282,
      "bbox": [104.74, 11.42, 105.04, 11.69]
    }
  ],
  "meta": { "total": 25, "source": "local_cache" }
}
\`\`\`

#### 4.11.3. Single Boundary Lookup
- **Method**: \`GET\`
- **Path**: \`/api/boundaries/item/:code\` or \`/api/boundaries/provinces/:code\`, \`/api/boundaries/districts/:code\`, \`/api/boundaries/communes/:code\`
- Returns single GeoJSON \`Feature\` with geometry and enriched properties.

#### 4.11.4. Ascending Hierarchy
- **Method**: \`GET\`
- **Path**: \`/api/boundaries/hierarchy/:code\`
- Resolves ascending boundary polygons: \`{ province?: Feature, district?: Feature, commune?: Feature }\`.

---

### 4.12. Health Check & Diagnostics
Used by container orchestrators, load balancers, and uptime monitors.

- **Method**: \`GET\`
- **Path**: \`/health\`
- **Response Format (200 OK)**:
\`\`\`json
{
  "status": "ok",
  "uptimeSeconds": 86400,
  "timestamp": "${lastSync}"
}
\`\`\`

---

## 5. Standard Error Responses

All error payloads follow a uniform structure:
\`\`\`json
{
  "success": false,
  "data": null,
  "error": "Error description message"
}
\`\`\`

| HTTP Code | Description | Typical Cause |
| :--- | :--- | :--- |
| \`400 Bad Request\` | Missing or invalid parameters | Invalid integer ID, query length > 100, lat/lon out of range |
| \`404 Not Found\` | Resource not found | Invalid division ID, geocoding returned no results |
| \`429 Too Many Requests\` | Rate limit exceeded | Exceeded 120 req/min for admin or 30 req/min for geocode |
| \`500 Internal Error\` | Server execution error | Sanitized error message without leaking internal stack traces |

---

## 6. Client Integration Code Examples

### 6.1. Complete Cascading Address Selector (TypeScript / Node.js)
\`\`\`typescript
class OpenGeoClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://opengeo-cambodia.pphat.me') {
    this.baseUrl = baseUrl;
  }

  async getProvinces() {
    const res = await fetch(\`\${this.baseUrl}/api/admin/provinces\`);
    const json = await res.json();
    return json.data;
  }

  async getDistricts(provinceId: number) {
    const res = await fetch(\`\${this.baseUrl}/api/admin/provinces/\${provinceId}/districts\`);
    const json = await res.json();
    return json.data;
  }

  async getCommunes(districtId: number) {
    const res = await fetch(\`\${this.baseUrl}/api/admin/districts/\${districtId}/communes\`);
    const json = await res.json();
    return json.data;
  }

  async getVillages(communeId: number) {
    const res = await fetch(\`\${this.baseUrl}/api/admin/communes/\${communeId}/villages\`);
    const json = await res.json();
    return json.data;
  }

  async reverseGeocode(lat: number, lon: number) {
    const res = await fetch(\`\${this.baseUrl}/api/geocode/reverse?lat=\${lat}&lon=\${lon}\`);
    const json = await res.json();
    return json.data;
  }
}

// Example usage:
const client = new OpenGeoClient();
const provinces = await client.getProvinces();
console.log(\`Loaded \${provinces.length} provinces.\`);
\`\`\`

### 6.2. Python Integration
\`\`\`python
import requests

class OpenGeoCambodia:
    def __init__(self, base_url="https://opengeo-cambodia.pphat.me"):
        self.base_url = base_url.rstrip("/")

    def get_provinces(self):
        r = requests.get(f"{self.base_url}/api/admin/provinces")
        r.raise_for_status()
        return r.json().get("data", [])

    def get_districts(self, province_id: int):
        r = requests.get(f"{self.base_url}/api/admin/provinces/{province_id}/districts")
        r.raise_for_status()
        return r.json().get("data", [])

    def reverse_geocode(self, lat: float, lon: float):
        r = requests.get(f"{self.base_url}/api/geocode/reverse", params={"lat": lat, "lon": lon})
        r.raise_for_status()
        return r.json().get("data")

# Example usage:
geo = OpenGeoCambodia()
provinces = geo.get_provinces()
print(f"Total Provinces: {len(provinces)}")
\`\`\`

---

## 7. LLM & AI Agent Guidelines (Best Practices)

When generating code or addressing user questions about Cambodian geography:
1. **Always Use 4 Tiers**: Never conflate District (Khan/Srok) with Commune (Sangkat/Khum). Cambodian addresses are strictly 4 levels.
2. **Khmer vs Romanized**: When storing user data, preserve both \`name_km\` and \`name_en\` for dual-language invoices, KYC, and waybills.
3. **Phnom Penh Special Case**: Remember that Phnom Penh has **Khans** (not Sroks) and **Sangkats** (not Khums).
4. **Sub-millisecond Cascades**: Instruct developers to call \`/api/admin/*\` directly from front-ends as it has built-in CORS and $<1\\text{ms}$ latency.
5. **Rate Limit Handling**: When writing high-throughput scripts, handle \`429 Too Many Requests\` with exponential backoff using the \`Retry-After\` header.
`;
}

export function runGenerator() {
    console.log(
        "🤖 Generating LLM documentation (llms.txt & llms-full.txt)...",
    );
    const stats = getStats();

    const llmsTxtContent = generateLlmsTxt(stats);
    const llmsFullTxtContent = generateLlmsFullTxt(stats);

    // 1. Write to rootDir
    fs.writeFileSync(path.join(rootDir, "llms.txt"), llmsTxtContent, "utf-8");
    fs.writeFileSync(
        path.join(rootDir, "llms-full.txt"),
        llmsFullTxtContent,
        "utf-8",
    );
    console.log("📄 Generated llms.txt and llms-full.txt in root directory.");

    // 2. Write to distDir if dist directory exists
    if (fs.existsSync(distDir)) {
        fs.writeFileSync(
            path.join(distDir, "llms.txt"),
            llmsTxtContent,
            "utf-8",
        );
        fs.writeFileSync(
            path.join(distDir, "llms-full.txt"),
            llmsFullTxtContent,
            "utf-8",
        );
        console.log(
            "📄 Generated llms.txt and llms-full.txt in dist/ directory.",
        );
    }

    console.log(
        `✅ LLM docs generated successfully (${stats.provinces} Provinces, ${stats.districts} Districts, ${stats.communes} Communes, ${stats.villages} Villages).`,
    );
}

// Auto-run if executed directly
const isMain = Boolean(
    process.argv[1] && (
        path.resolve(process.argv[1]).toLowerCase() ===
            path.resolve(__filename).toLowerCase() ||
        process.argv[1].endsWith("generate-llms.ts") ||
        process.argv[1].endsWith("generate-llms.js")
    ),
);
if (isMain) {
    runGenerator();
}
