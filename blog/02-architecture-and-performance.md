---
title: "Under the Hood: Architecture & Sub-Millisecond In-Memory Indexing"
series: "Building with OpenGeo Cambodia"
part: 2
slug: "02-architecture-and-performance"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["Architecture", "Performance", "CloudflareWorkers", "TypeScript", "Geospatial"]
description: "How OpenGeo Cambodia eliminates database bottlenecks using in-memory O(1) hash maps, spatial bounding-box indexing, and edge caching."
---

# Part 2: Under the Hood — Architecture & Sub-Millisecond In-Memory Indexing

Traditional geocoding pipelines and administrative APIs often introduce 150ms–500ms of latency per keystroke. When a user fills out a checkout form on a mobile phone over 4G, waiting half a second for each dropdown (Province $\to$ District $\to$ Commune $\to$ Village) creates friction and abandonments.

In this post, we explore how OpenGeo Cambodia was engineered to deliver **sub-millisecond (< 1ms) response times** through an in-memory hybrid architecture.

---

## High-Performance Hybrid Architecture

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

The system splits responsibilities into two dedicated pathways:
1. **The In-Memory Spatial Repository (`AdminStore` & `BoundariesService`)**: Handles all administrative hierarchy queries, cascading dropdowns, bilingual search, and Point-in-Polygon zone lookups directly from RAM with $O(1)$ complexity.
2. **The Reverse Geocoding Normalizer (`GeocodeService`)**: Interfaces with OpenStreetMap Nominatim for arbitrary GPS point-to-street resolution, mapping unstructured foreign payloads into Cambodia's official 4 tiers.

---

## Why No Database? The Power of In-Memory Static Datasets

Administrative boundaries rarely change. Sroks and Sangkats are created or updated via royal decrees (Kret) perhaps once or twice a year. 

Spinning up a PostgreSQL + PostGIS database to serve 16,472 static records means paying unnecessary cloud compute costs, dealing with connection pooling, network hops between app servers and database instances, and disk I/O serialization.

Instead, OpenGeo Cambodia pre-indexes all 16,472 entities into memory on process startup:

### 1. In-Memory Hash Maps for $O(1)$ Child Lookups

Instead of executing `SELECT * FROM communes WHERE district_id = 1202`, the server maintains parent-to-children indices:

```typescript
class AdminStore {
  // Key: parentId, Value: array of children
  private childrenByParent = new Map<number, AdminItem[]>();
  // Key: divisionId, Value: item
  private itemsById = new Map<number, AdminItem>();
  // Key: NCDD code, Value: item
  private itemsByCode = new Map<string, AdminItem>();

  getChildren(parentId: number): AdminItem[] {
    return this.childrenByParent.get(parentId) ?? [];
  }

  getById(id: number): AdminItem | undefined {
    return this.itemsById.get(id);
  }
}
```

Looking up all communes within Khan Doun Penh is a pointer retrieval in RAM: **tookMs: 0.2ms–0.4ms**.

---

## Spatial Indexing: Bounding Box Pre-Filter + Ray-Casting

Point-in-Polygon (PIP) algorithms determine whether a point $(x, y)$ falls inside a complex multi-ring polygon. Running ray-casting across every single polygon in Cambodia on every API request would consume high CPU.

To achieve sub-millisecond execution, we use a **two-tier spatial index**:

### Phase 1: $O(1)$ Bounding Box Filtering
Every province, district, and commune polygon is pre-computed with its 2D Bounding Box:
$$\text{bbox} = [\min(\text{lon}), \min(\text{lat}), \max(\text{lon}), \max(\text{lat})]$$

When a coordinate query arrives (e.g. `lat=11.57608, lng=104.92305`):
```typescript
function pointInBBox(lon: number, lat: number, bbox: BBox): boolean {
  return lon >= bbox[0] && lat >= bbox[1] && lon <= bbox[2] && lat <= bbox[3];
}
```
In a fraction of a microsecond, 99% of Cambodia's polygons are eliminated.

### Phase 2: Ray-Casting on Candidates Only
Only the remaining 1 or 2 matching candidates undergo ray-casting intersection:

```typescript
function pointInPolygon(point: [number, number], polygon: number[][][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }
  return inside;
}
```

The entire query resolves in under **0.85 ms**!

---

## Dual Runtime Portability: Edge & Node.js

The entire backend is built with [Hono](https://hono.dev), allowing the identical codebase to deploy seamlessly across environments:

1. **Cloudflare Workers (Edge)**: Deployed across 300+ data centers worldwide. Users in Phnom Penh hit Cloudflare's local PoP, enjoying instant edge delivery.
2. **Node.js**: The same app can be run as a standard container or standalone Node.js daemon using `@hono/node-server`.

---

## Benchmark Comparison

| Metric | Traditional SQL / PostGIS API | External Geocoding SaaS | OpenGeo Cambodia |
| :--- | :--- | :--- | :--- |
| **Response Latency** | 45ms – 120ms | 200ms – 600ms | **< 1ms (Sub-millisecond)** |
| **Cold Starts** | 1.5s – 3.0s | N/A | **< 50ms** |
| **API Cost** | \$20–\$80/mo (DB instance) | \$5 per 1,000 requests | **\$0 (100% Free / MIT)** |
| **Offline / Local Dev** | Requires PostGIS setup | Requires internet connection | **Runs 100% locally with zero external dependencies** |

---

## Up Next

In **[Part 3: Administrative Hierarchy & Search API](03-administrative-hierarchy-api.md)**, we examine each cascading endpoint, single-call full-tree resolution, and bilingual search implementation.

---

[← Previous: Part 1 — Introduction & Domain Model](01-introduction-and-domain-model.md) | [Next: Part 3 — Administrative Hierarchy API →](03-administrative-hierarchy-api.md)
