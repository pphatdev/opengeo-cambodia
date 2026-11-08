---
title: "The Cambodia Address Problem & 4-Tier Administrative Model"
series: "Building with OpenGeo Cambodia"
part: 1
slug: "01-introduction-and-domain-model"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["Cambodia", "Geospatial", "API", "OpenSource", "Architecture"]
description: "Why Cambodian geographic data has historically been broken, and how OpenGeo Cambodia models the authoritative 4-tier administrative hierarchy."
---

# Part 1: The Cambodia Address Problem & 4-Tier Administrative Model

![OpenGeo Cambodia Platform Banner](/cover.webp)

If you have ever built a web or mobile application in Cambodia — whether an e-commerce checkout flow, a delivery routing system, a fintech KYC onboarding pipeline, or a data dashboard — you have almost certainly bumped into the **Cambodia address problem**:

- Where do you get an accurate, standardized list of all provinces, districts, communes, and villages?
- How do you handle bilingual search when users type in native Khmer script (`រាជធានីភ្នំពេញ`), standard English (`Phnom Penh`), or popular phonetic variations (`Siem Reap` vs `Siemreap`, `Tuol Kork` vs `Toul Kork`)?
- Where can you find lightweight GeoJSON boundaries for interactive maps without downloading multi-gigabyte shapefiles?
- And why should developers have to pay expensive recurring SaaS fees or spin up heavy PostGIS databases just to populate four cascading dropdowns?

To solve these challenges, we built **[OpenGeo Cambodia](https://opengeo-cambodia.pphat.me)**: an open-source, 100% free, production-ready geospatial platform and REST API engineered specifically for Cambodia.

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

## The Domain Model: How Cambodian Divisions Work

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

### Understanding Administrative Types

Cambodia uses distinct administrative terminology depending on urban versus rural status:
1. **Capital vs Provinces**:
   - `រាជធានី` (Reachdhanie): Capital Municipality (Phnom Penh).
   - `ខេត្ត` (Khaet): Province (all other 24 provinces).
2. **Subdivisions of Provinces & Capital**:
   - `ខណ្ឌ` (Khan): Urban district within the Capital (e.g., Khan Doun Penh).
   - `ក្រុង` (Krong): Provincial city or municipality (e.g., Krong Siem Reap).
   - `ស្រុក` (Srok): Rural district in a province (e.g., Srok Prasat Bakong).
3. **Subdivisions of Districts**:
   - `សង្កាត់` (Sangkat): Urban quarter or commune within a Khan or Krong.
   - `ឃុំ` (Khum): Rural commune within a Srok.
4. **Villages**:
   - `ភូមិ` (Phum): The smallest recognized community division.

### Data Contract

Every record returned by OpenGeo Cambodia adheres to a clean, typed contract:

```typescript
interface AdminItem {
  id: number;           // Unique integer ID (e.g., 120201)
  code: string;         // Official NCDD numeric code ("120201")
  name: string;         // Standard English name ("Phsar Thmei 1")
  name_en: string;      // Standard English Romanization
  name_km: string;      // Native Khmer script ("សង្កាត់ផ្សារថ្មីទី១")
  typeKm: string;       // Specific type designation ("សង្កាត់")
  level: "province" | "district" | "commune" | "village";
  parentId: number | null; // ID of the enclosing administrative parent
  lat?: number;         // Geographic centroid latitude
  lon?: number;         // Geographic centroid longitude
}
```

---

## Up Next

In **[Part 2: Under the Hood — Architecture & Sub-Millisecond In-Memory Indexing](02-architecture-and-performance.md)**, we explore how OpenGeo Cambodia was engineered to deliver sub-millisecond response times without any external database bottlenecks.

---

[Next: Part 2 — Architecture & In-Memory Indexing →](02-architecture-and-performance.md)
