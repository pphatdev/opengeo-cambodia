---
title: "Introducing OpenGeo Cambodia: The Free, Sub-Millisecond Geography & Administrative Boundary API"
slug: "introducing-opengeo-cambodia"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["Cambodia", "Geospatial", "API", "OpenSource", "WebDevelopment", "GIS", "TypeScript"]
cover_image: "/cover.webp"
description: "A deep dive into OpenGeo Cambodia — an open-source, sub-millisecond REST API delivering complete 4-tier administrative divisions, Point-in-Polygon boundary resolution, and reverse geocoding for Cambodia."
---

# Introducing OpenGeo Cambodia: The Free, Sub-Millisecond Geography & Administrative Boundary API

![OpenGeo Cambodia Platform Banner](/cover.webp)

If you have ever built a web or mobile application in Cambodia — whether an e-commerce checkout flow, a delivery routing system, a fintech KYC onboarding pipeline, or a data dashboard — you have almost certainly bumped into the **Cambodia address problem**:

- Where do you get an accurate, standardized list of all provinces, districts, communes, and villages?
- How do you handle bilingual search when users type in native Khmer script (`រាជធានីភ្នំពេញ`), standard English (`Phnom Penh`), or popular phonetic variations (`Siem Reap` vs `Siemreap`, `Tuol Kork` vs `Toul Kork`)?
- Where can you find lightweight GeoJSON boundaries for interactive maps without downloading multi-gigabyte shapefiles?
- And why should developers have to pay expensive recurring SaaS fees or spin up heavy PostGIS databases just to populate four cascading dropdowns?

To solve these challenges once and for all, we built **[OpenGeo Cambodia](https://opengeo-cambodia.pphat.me)**: an open-source, 100% free, production-ready geospatial platform and REST API engineered specifically for Cambodia.

In this post, we'll walk through why OpenGeo Cambodia was created, how its 4-tier administrative domain model works, how we achieved sub-millisecond response times, and how you can integrate it into your apps in minutes.

---

## The Three Core Pillars

OpenGeo Cambodia is designed around three foundational commitments:

### 1. Authoritative 4-Tier Administrative Hierarchy
The dataset is officially sourced from the **Ministry of Economy and Finance Open Data Portal** ([data.mef.gov.kh](https://data.mef.gov.kh/)) and cross-referenced with official NCDD (National Committee for Sub-National Democratic Development) administrative codes. It covers all four official tiers of Cambodian administration:
- **Tier 1 — 25 Provinces & Capital** (រាជធានី / ខេត្ត): 1 Capital Municipality (Phnom Penh) + 24 Provinces.
- **Tier 2 — 210 Districts, Khans & Krongs** (ស្រុក / ខណ្ឌ / ក្រុង): 14 Khans, 32 Krongs, and 164 Sroks.
- **Tier 3 — 1,661 Communes & Sangkats** (ឃុំ / សង្កាត់): 331 Sangkats and 1,330 Khums.
- **Tier 4 — 14,576 Villages** (ភូមិ): Complete Phum coverage across the entire country.

### 2. 100% Free and Open Source (MIT)
Zero API keys, zero rate-paywalls, zero subscriptions. Developers, startups, NGOs, universities, and public institutions can use it freely in production under the permissive MIT license.

### 3. Ultra-Low Latency (< 1ms Lookups)
By storing pre-indexed, in-memory $O(1)$ hash maps and spatial bounding boxes, administrative queries resolve in less than **1 millisecond**. Frontend cascading dropdowns update instantly with zero perceived lag.

$$\text{City / Province (រាជធានី / ខេត្ត)} \longrightarrow \text{District / Khan (ស្រុក / ខណ្ឌ)} \longrightarrow \text{Commune / Sangkat (ឃុំ / សង្កាត់)} \longrightarrow \text{Village (ភូមិ)}$$

---

## Cambodian Administrative Domain Model

Cambodia's administrative structure follows a hierarchical tree. Each tier appends two numeric digits to its parent's code:

```text
[12]             Province: Phnom Penh (រាជធានីភ្នំពេញ)
 └── [1202]          District: Khan Doun Penh (ខណ្ឌដូនពេញ)
      └── [120201]       Commune: Sangkat Phsar Thmei 1 (សង្កាត់ផ្សារថ្មីទី១)
           └── [12020101]    Village: Phum 1 (ភូមិ១)
```

| Level | Khmer Title | Romanization | Count | Code Format | OpenStreetMap Equivalent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | រាជធានី / ខេត្ត | Reachdhanie / Khaet | **25** | `XX` (2 digits) | `boundary=administrative`, `admin_level=4` |
| **Tier 2** | ស្រុក / ខណ្ឌ / ក្រុង | Srok / Khan / Krong | **210** | `XXXX` (4 digits) | `boundary=administrative`, `admin_level=6` |
| **Tier 3** | ឃុំ / សង្កាត់ | Khum / Sangkat | **1,661** | `XXXXXX` (6 digits) | `boundary=administrative`, `admin_level=8` |
| **Tier 4** | ភូមិ | Phum (Village) | **14,576** | `XXXXXXXX` (8 digits) | `place=village` / `place=hamlet` |

Every single record is bilingual, containing:
- `name_km`: Native Khmer script (e.g., `ខណ្ឌចំការមន`)
- `name_en`: Standardized English Romanization (e.g., `Chamkar Mon`)
- `code`: Official NCDD numeric code
- `typeKm`: Specific designation (`រាជធានី`, `ខេត្ត`, `ខណ្ឌ`, `ក្រុង`, `ស្រុក`, `សង្កាត់`, `ឃុំ`, `ភូមិ`)
- Geographic centroids: `lat` and `lon` coordinates

---

## Architecture: How We Achieve Sub-Millisecond Speeds

Traditional geocoding setups rely on disk-bound database queries, heavy SQL joins, or external third-party APIs that introduce 100ms–500ms of latency per keystroke.

OpenGeo Cambodia uses a **Hybrid High-Performance Architecture**:

```text
┌────────────────────────────────────────────────────────┐
│                   Client Application                   │
│          (Web, Mobile, E-commerce, Logistics)          │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
      Dropdowns & Search         GPS Pin Lookup & Reverse
               │                          │
               ▼                          ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  In-Memory Store (Store.ts)  │   │  Geocoding / Nominatim OSM   │
│  • O(1) Hierarchy Indices    │   │  • Fallback normalization    │
│  • BBox Ray-Casting Spatial  │   │  • Automatic 4-tier mapping  │
│  • < 1ms response time       │   └──────────────────────────────┘
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Global Edge Cache (CDN)    │
│   • 300+ PoPs worldwide      │
│   • Instant client delivery  │
└──────────────────────────────┘
```

1. **In-Memory Hash Indexing**: All 16,472 administrative units are loaded into optimized RAM hash structures upon boot. Looking up the children of a province or district is an $O(1)$ memory lookup taking $< 0.5\text{ ms}$.
2. **Point-in-Polygon with Spatial Bounding Box Filtering**: Rather than executing expensive polygon intersection algorithms against thousands of complex geometries, we first run a high-speed 2D bounding box pre-filter ($O(1)$ range check). Only polygons whose bounding box encloses the coordinate undergo ray-casting intersection, enabling sub-millisecond point-to-boundary resolution.
3. **Bilingual Search Tolerant of Variations**: An in-memory normalized search index strips diacritics, spaces, and punctuation, ranking exact prefix matches first. Searching `siem reap`, `siemreap`, or `សៀមរាប` effortlessly resolves the correct entity.
4. **Cloudflare Workers & Node.js Deployment**: Deployed simultaneously to Cloudflare Workers (300+ Edge PoPs) and standalone Node.js environments.

---

## API Tour: The Endpoints Every Developer Needs

The production base URL is:
```
https://opengeo-cambodia.pphat.me
```

### 1. Cascading Administrative Dropdowns

#### Get All 25 Provinces
```http
GET /api/admin/provinces
```
```json
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
  "meta": { "total": 25, "tookMs": 0.42, "source": "local_cache" }
}
```

#### Get Districts in a Province
```http
GET /api/admin/provinces/12/districts
```
Returns all 14 Khans of Phnom Penh (Chamkar Mon, Doun Penh, Prampir Meakkakra, Tuol Kork, etc.).

#### Get Communes in a District
```http
GET /api/admin/districts/1202/communes
```
Returns all Sangkats in Khan Doun Penh (Phsar Thmei 1, Boeng Reang, Voat Phnum, etc.).

#### Get Villages in a Commune
```http
GET /api/admin/communes/120201/villages
```
Returns all Phums within Sangkat Phsar Thmei 1.

---

### 2. Ascending Full Hierarchy Resolution (`/api/admin/hierarchy/:id`)

When storing addresses in a database, best practice is to store only the lowest-level ID (e.g., the `village_id`). When you need to display the full address on an invoice or shipping label, call `/api/admin/hierarchy/:id` once:

```http
GET /api/admin/hierarchy/12020101
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "province": { "id": 12, "code": "12", "name_en": "Phnom Penh", "name_km": "រាជធានីភ្នំពេញ" },
    "district": { "id": 1202, "code": "1202", "name_en": "Doun Penh", "name_km": "ខណ្ឌដូនពេញ" },
    "commune": { "id": 120201, "code": "120201", "name_en": "Phsar Thmei 1", "name_km": "សង្កាត់ផ្សារថ្មីទី១" },
    "village": { "id": 12020101, "code": "12020101", "name_en": "Phum 1", "name_km": "ភូមិ១" }
  }
}
```

---

### 3. Sub-Millisecond Point-in-Polygon Boundary Zone (`/api/boundaries/zone`)

Need to know which province, district, and commune contain a given GPS coordinate? Pass `lat` and `lng`:

```http
GET /api/boundaries/zone?lat=11.57608&lng=104.92305&format=summary
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matched": true,
    "point": { "lat": 11.57608, "lng": 104.92305 },
    "province": { "code": "12", "name_en": "Phnom Penh", "name_km": "រាជធានីភ្នំពេញ", "level": "province" },
    "district": { "code": "1202", "name_en": "Doun Penh", "name_km": "ខណ្ឌដូនពេញ", "level": "district" },
    "commune": { "code": "120201", "name_en": "Phsar Thmei 1", "name_km": "សង្កាត់ផ្សារថ្មីទី១", "level": "commune" }
  },
  "meta": { "tookMs": 0.85, "source": "spatial_index" }
}
```

If you request `format=geojson`, you get back the actual GeoJSON polygon boundaries enclosing that point — perfect for immediately rendering delivery zones or geofenced perimeters on Leaflet or Mapbox!

---

### 4. High-Resolution GeoJSON Polygons (`/api/boundaries/*`)

OpenGeo Cambodia provides pre-processed, topologically sound GeoJSON boundaries for all administrative levels:

- `GET /api/boundaries/provinces` — All 25 province polygons.
- `GET /api/boundaries/provinces/12` — Single boundary polygon for Phnom Penh.
- `GET /api/boundaries/districts?province_code=12` — District polygons within Phnom Penh.
- `GET /api/boundaries/communes?district_code=1202` — Commune polygons within Khan Doun Penh.
- `GET /api/boundaries/hierarchy/120201` — All 3 enclosing polygons (commune + district + province) in one call.

Every feature includes `bbox`, `name_km`, `name_en`, and official codes:

```json
{
  "type": "Feature",
  "id": "12",
  "bbox": [104.777, 11.434, 105.083, 11.688],
  "properties": {
    "code": "12",
    "name_en": "Phnom Penh",
    "name_km": "រាជធានីភ្នំពេញ",
    "level": "province"
  },
  "geometry": { "type": "Polygon", "coordinates": [ /* ... */ ] }
}
```

---

### 5. Smart GPS Reverse Geocoding (`/api/geocode/reverse`)

When a mobile app user drops a pin on a map:

```http
GET /api/geocode/reverse?lat=11.5714&lon=104.9250
```

```json
{
  "success": true,
  "data": {
    "displayName": "Doun Penh, Phnom Penh, 120201, Cambodia",
    "lat": 11.5714,
    "lon": 104.925,
    "hierarchy": {
      "province": "Phnom Penh",
      "district": "Doun Penh",
      "commune": "Phsar Thmei 1",
      "village": null,
      "country": "Cambodia"
    }
  },
  "meta": { "tookMs": 142.3, "source": "nominatim" }
}
```

---

## Code Examples

### 1. Vanilla JavaScript / TypeScript Cascading Selectors

```typescript
const BASE = "https://opengeo-cambodia.pphat.me/api/admin";

// 1. Populate Provinces on page load
async function loadProvinces() {
  const res = await fetch(`${BASE}/provinces`);
  const { data: provinces } = await res.json();
  const select = document.getElementById("province-select");
  
  provinces.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name_km} (${p.name_en})`;
    select.appendChild(opt);
  });
}

// 2. Load Districts when Province changes
async function onProvinceChange(provinceId: number) {
  const res = await fetch(`${BASE}/provinces/${provinceId}/districts`);
  const { data: districts } = await res.json();
  // Populate district dropdown...
}

// 3. Load Communes when District changes
async function onDistrictChange(districtId: number) {
  const res = await fetch(`${BASE}/districts/${districtId}/communes`);
  const { data: communes } = await res.json();
  // Populate commune dropdown...
}
```

### 2. Python / GeoPandas Spatial Analysis

```python
import requests
import geopandas as gpd

# Fetch all 25 province polygons in GeoJSON format
url = "https://opengeo-cambodia.pphat.me/api/boundaries/provinces"
response = requests.get(url)
geojson_data = response.json()

# Load directly into a GeoPandas GeoDataFrame
gdf = gpd.GeoDataFrame.from_features(geojson_data["features"])

print(f"Loaded {len(gdf)} provinces.")
print(gdf[["code", "name_en", "name_km"]].head())

# Perform spatial queries or plot with Matplotlib
gdf.plot(edgecolor="black", color="#0d9488")
```

### 3. Rendering Boundaries with Leaflet

```javascript
import L from "leaflet";

const map = L.map("map").setView([11.5564, 104.9282], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Fetch Phnom Penh's district polygons
fetch("https://opengeo-cambodia.pphat.me/api/boundaries/districts?province_code=12")
  .then(res => res.json())
  .then(geojson => {
    L.geoJSON(geojson, {
      style: {
        color: "#0d9488",
        weight: 2,
        fillColor: "#0284c7",
        fillOpacity: 0.15
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`<b>${feature.properties.name_km}</b><br/>${feature.properties.name_en}`);
      }
    }).addTo(map);
  });
```

---

## AI Agent Integration with `llms.txt`

OpenGeo Cambodia is built for the modern AI era, adhering to the [llmstxt.org](https://llmstxt.org) specification. When building applications using AI coding assistants like **Cursor, Claude, ChatGPT, GitHub Copilot, or Antigravity**, you can provide the API documentation context directly:

- **Summary Context**: [`https://opengeo-cambodia.pphat.me/llms.txt`](https://opengeo-cambodia.pphat.me/llms.txt) (concise overview of tiers, endpoints, and rate limits)
- **Full Context**: [`https://opengeo-cambodia.pphat.me/llms-full.txt`](https://opengeo-cambodia.pphat.me/llms-full.txt) (complete JSON schemas, TypeScript contracts, and error responses)

### Using with Cursor
Add this line to your project's `.cursorrules` or system prompt:
```text
Always consult https://opengeo-cambodia.pphat.me/llms.txt for Cambodian administrative hierarchy, boundary data, and address normalization rules.
```

---

## Useful Links & Resources

- 🌐 **Live Website & Interactive Map Explorer**: [https://opengeo-cambodia.pphat.me](https://opengeo-cambodia.pphat.me)
- 📚 **Interactive API Documentation**: [https://opengeo-cambodia.pphat.me/docs](https://opengeo-cambodia.pphat.me/docs)
- 📮 **Official Postman Collection**: [`opengeo-cambodia.postman_collection.json`](https://opengeo-cambodia.pphat.me/opengeo-cambodia.postman_collection.json) (includes built-in collection variables and test assertions)
- 💾 **Raw CSV & GeoJSON Downloads**: Available directly from the website's Downloads section.
- 🐙 **GitHub Repository**: [https://github.com/pphatdev/opengeo-cambodia](https://github.com/pphatdev/opengeo-cambodia)

---

## Summary

Accurate, standardized geographic infrastructure is a foundational building block for modern software. With OpenGeo Cambodia, developers no longer have to reinvent the wheel, manually clean spreadsheets, or compromise on speed.

We welcome feedback, issues, and contributions on GitHub. If you build something exciting using OpenGeo Cambodia, let us know!

Happy coding! 🇰🇭🚀

