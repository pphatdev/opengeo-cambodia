---
title: "Administrative Hierarchy & Search API"
series: "Building with OpenGeo Cambodia"
part: 3
slug: "03-administrative-hierarchy-api"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["REST-API", "WebDevelopment", "JavaScript", "TypeScript", "Backend"]
description: "A comprehensive guide to OpenGeo Cambodia's administrative endpoints, cascading queries, full-tree resolution, and bilingual search."
---

# Part 3: Administrative Hierarchy & Search API

Building a smooth checkout or address form requires populating cascading dropdowns quickly without downloading large static JSON files to the browser. 

In this post, we cover OpenGeo Cambodia's `/api/admin/*` endpoints designed for instant UI interactions.

---

## 1. Cascading Administrative Hierarchy

### Step 1: Fetch All 25 Provinces
```http
GET https://opengeo-cambodia.pphat.me/api/admin/provinces
```

**Response (200 OK):**
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
  "meta": {
    "total": 25,
    "tookMs": 0.38,
    "source": "local_cache"
  }
}
```

### Step 2: Fetch Districts by Province ID
When the user picks a province (e.g. `12` for Phnom Penh), query its direct children:
```http
GET https://opengeo-cambodia.pphat.me/api/admin/provinces/12/districts
```
Returns all 14 Khans of Phnom Penh (Khan Chamkar Mon, Khan Doun Penh, Khan 7 Makara, Khan Tuol Kork, etc.).

### Step 3: Fetch Communes by District ID
When the user picks a district (e.g. `1202` for Khan Doun Penh):
```http
GET https://opengeo-cambodia.pphat.me/api/admin/districts/1202/communes
```
Returns all 11 Sangkats within Khan Doun Penh (Sangkat Phsar Thmei 1, Sangkat Phsar Thmei 2, Sangkat Boeng Reang, etc.).

### Step 4: Fetch Villages by Commune ID
When the user picks a commune (e.g. `120201` for Sangkat Phsar Thmei 1):
```http
GET https://opengeo-cambodia.pphat.me/api/admin/communes/120201/villages
```
Returns all Phums belonging to that Sangkat.

---

## 2. Full RESTful Nested Resource Routing

For strict REST architectures and hierarchical URL patterns, OpenGeo Cambodia supports deep nested routing paths that automatically enforce and validate parent-child relationships at each tier:

```http
# 1. District nested under province
GET https://opengeo-cambodia.pphat.me/api/admin/provinces/12/districts/1202

# 2. Communes nested under district and province
GET https://opengeo-cambodia.pphat.me/api/admin/provinces/12/districts/1202/communes

# 3. Single commune nested under district and province
GET https://opengeo-cambodia.pphat.me/api/admin/provinces/12/districts/1202/communes/120201

# 4. Villages nested under commune, district, and province
GET https://opengeo-cambodia.pphat.me/api/admin/provinces/12/districts/1202/communes/120201/villages

# 5. Full 4-tier nested path to a single village
GET https://opengeo-cambodia.pphat.me/api/admin/provinces/12/districts/1202/communes/120201/villages/12020101
```

If a child ID does not belong to the specified parent (for example, attempting to access a Battambang district ID under Phnom Penh's province ID `12`), the API returns a strict `404 Not Found` with a descriptive error message.

---

## 3. Resolving the Complete 4-Tier Hierarchy Path

### The Problem: Redundant Database Storage
When storing customer addresses in your database, developers often make the mistake of saving four separate columns:
`province_name`, `district_name`, `commune_name`, `village_name`.
This leads to data corruption when spelling changes or names are updated.

### The Solution: Store the Village ID, Resolve on Demand
Store only the `village_id` (e.g., `12020101`). When generating an invoice, dispatching a package, or printing a shipping label, call `/api/admin/hierarchy/:id` once:

```http
GET https://opengeo-cambodia.pphat.me/api/admin/hierarchy/12020101
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "province": {
      "id": 12,
      "code": "12",
      "name_en": "Phnom Penh",
      "name_km": "រាជធានីភ្នំពេញ"
    },
    "district": {
      "id": 1202,
      "code": "1202",
      "name_en": "Doun Penh",
      "name_km": "ខណ្ឌដូនពេញ"
    },
    "commune": {
      "id": 120201,
      "code": "120201",
      "name_en": "Phsar Thmei 1",
      "name_km": "សង្កាត់ផ្សារថ្មីទី១"
    },
    "village": {
      "id": 12020101,
      "code": "12020101",
      "name_en": "Phum 1",
      "name_km": "ភូមិ១"
    }
  },
  "meta": {
    "tookMs": 0.22,
    "source": "local_cache"
  }
}
```

The response provides both English and Khmer names for all levels in under **0.3 milliseconds**!

---

## 3. Bilingual Administrative Search

Users rarely know whether they need to type in Khmer or English. OpenGeo Cambodia's search endpoint accepts either script and tolerates whitespace, casing, and common Romanization variants:

```http
GET https://opengeo-cambodia.pphat.me/api/admin/search?q=Siem+Reap&limit=5
```

You can optionally filter by administrative level:
```http
GET https://opengeo-cambodia.pphat.me/api/admin/search?q=Doun+Penh&level=district&limit=5
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1202,
      "code": "1202",
      "name": "Doun Penh",
      "name_en": "Doun Penh",
      "name_km": "ខណ្ឌដូនពេញ",
      "typeKm": "ខណ្ឌ",
      "level": "district",
      "parentId": 12,
      "lat": 11.5714,
      "lon": 104.925
    }
  ],
  "meta": {
    "total": 1,
    "tookMs": 0.45,
    "source": "local_cache"
  }
}
```

---

## Up Next

In **[Part 4: High-Resolution Boundaries & Point-in-Polygon Spatial Engine](../boundaries/04-boundaries-and-point-in-polygon.md)**, we dive into GeoJSON boundary datasets and how to resolve boundary zones from raw GPS coordinates in sub-milliseconds.

---

[← Previous: Part 2 — Architecture & Performance](../system/02-architecture-and-performance.md) | [Next: Part 4 — Boundaries & Point-in-Polygon →](../boundaries/04-boundaries-and-point-in-polygon.md)

