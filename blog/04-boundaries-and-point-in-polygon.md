---
title: "High-Resolution Boundaries & Point-in-Polygon Spatial Engine"
series: "Building with OpenGeo Cambodia"
part: 4
slug: "04-boundaries-and-point-in-polygon"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["GeoJSON", "GIS", "Spatial", "Leaflet", "Mapbox", "Logistics"]
description: "Resolving administrative boundary zones from raw GPS coordinates in sub-milliseconds and serving clean GeoJSON polygon datasets."
---

# Part 4: High-Resolution Boundaries & Point-in-Polygon Spatial Engine

Interactive maps, delivery dispatch platforms, and spatial analytics require boundary polygons. Historically in Cambodia, getting clean vector boundaries meant sifting through disparate government shapefiles, dealing with overlapping polygons, or fixing invalid coordinates.

OpenGeo Cambodia provides clean, standardized GeoJSON polygon boundaries alongside a high-performance **in-memory Point-in-Polygon (PIP) spatial query engine**.

---

## 1. Sub-Millisecond Point-in-Polygon Boundary Zone

The newest capability in OpenGeo Cambodia is the `/api/boundaries/zone` endpoint (aliased as `/point` and `/by-point`).

When given a GPS coordinate (e.g. from a mobile delivery driver's GPS or an IoT tracker), it instantly resolves the containing **Province, District, and Commune boundary zone**:

```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/zone?lat=11.57608&lng=104.92305&format=summary
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matched": true,
    "point": {
      "lat": 11.57608,
      "lng": 104.92305
    },
    "province": {
      "code": "12",
      "name_en": "Phnom Penh",
      "name_km": "រាជធានីភ្នំពេញ",
      "level": "province"
    },
    "district": {
      "code": "1202",
      "name_en": "Doun Penh",
      "name_km": "ខណ្ឌដូនពេញ",
      "level": "district"
    },
    "commune": {
      "code": "120201",
      "name_en": "Phsar Thmei 1",
      "name_km": "សង្កាត់ផ្សារថ្មីទី១",
      "level": "commune"
    }
  },
  "meta": {
    "tookMs": 0.85,
    "source": "spatial_index"
  }
}
```

### Returning Actual Polygons for Map Highlighting
If you request `format=geojson`, the API returns a valid GeoJSON `FeatureCollection` containing the actual polygon boundaries for the matched tiers:

```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/zone?lat=11.57608&lng=104.92305&format=geojson
```

This enables client-side map renderers (Leaflet, Mapbox, Google Maps, OpenLayers) to highlight the active delivery zone or territory boundary instantly without a second network trip.

---

## 2. Querying Administrative Boundaries

You can query boundaries individually or in filtered collections:

### All 25 Provinces
```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/provinces
```

### Specific Province Boundary
```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/provinces/12
```

### Districts Filtered by Province Code
```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/districts?province_code=12
```

### Communes Filtered by District Code
```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/communes?district_code=1202
```

### Nested Boundary Resource Routes
You can also use natural hierarchical nesting paths instead of query parameters:
```http
# Districts in a province
GET https://opengeo-cambodia.pphat.me/api/boundaries/provinces/12/districts

# Single district in a province
GET https://opengeo-cambodia.pphat.me/api/boundaries/provinces/12/districts/1202

# Communes in a district under a province
GET https://opengeo-cambodia.pphat.me/api/boundaries/provinces/12/districts/1202/communes

# Single commune under a district and province
GET https://opengeo-cambodia.pphat.me/api/boundaries/provinces/12/districts/1202/communes/120201
```

### Complete Ascending Boundary Stack
```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/hierarchy/120201
```
Returns three nested polygon features: the commune, its parent district, and its grandparent province.

---

## 3. Lightweight Metadata Mode (`format=summary`)

GeoJSON coordinates can be heavy over cellular networks. When you only need metadata (names, centroids, bounding boxes, codes) rather than coordinate arrays, add `format=summary`:

```http
GET https://opengeo-cambodia.pphat.me/api/boundaries/districts?province_code=12&format=summary
```

**Payload comparison:**
- Full GeoJSON: ~450 KB
- Summary JSON: ~3 KB (**99.3% bandwidth savings**)

---

## 4. Bulk GeoJSON Downloads

For offline GIS pipelines (QGIS, ArcGIS, GeoPandas, PostGIS imports), static raw files are hosted directly:

- Province Polygons: [`/api/boundaries/raw/provinces.geojson`](https://opengeo-cambodia.pphat.me/api/boundaries/raw/provinces.geojson)
- District Polygons: [`/api/boundaries/raw/districts.geojson`](https://opengeo-cambodia.pphat.me/api/boundaries/raw/districts.geojson)
- Commune Polygons: [`/api/boundaries/raw/communes.geojson`](https://opengeo-cambodia.pphat.me/api/boundaries/raw/communes.geojson)

---

## Up Next

In **[Part 5: Smart Reverse Geocoding & Address Autocomplete](05-geocoding-and-reverse-lookup.md)**, we examine how OpenGeo Cambodia translates raw GPS coordinates into human-readable Cambodian street addresses.

---

[← Previous: Part 3 — Administrative Hierarchy API](03-administrative-hierarchy-api.md) | [Next: Part 5 — Reverse Geocoding & Search →](05-geocoding-and-reverse-lookup.md)

