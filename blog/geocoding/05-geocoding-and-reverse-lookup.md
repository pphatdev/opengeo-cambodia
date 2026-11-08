---
title: "Smart Reverse Geocoding & Address Autocomplete"
series: "Building with OpenGeo Cambodia"
part: 5
slug: "05-geocoding-and-reverse-lookup"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["Geocoding", "Nominatim", "OpenStreetMap", "AddressSearch", "GPS"]
description: "How OpenGeo Cambodia normalizes raw OpenStreetMap and Nominatim data into clean 4-tier Cambodian administrative addresses."
---

# Part 5: Smart Reverse Geocoding & Address Autocomplete

Mobile apps frequently need to turn a user's GPS position into a recognizable street address. However, raw reverse geocoding responses from OpenStreetMap Nominatim or global providers are notoriously messy for Cambodia:

- Districts are alternately labelled as `suburb`, `quarter`, `county`, or `municipality`.
- Communes are often lumped together with districts or missing completely.
- Postal codes and province names frequently conflict.

OpenGeo Cambodia solves this through **Smart Reverse Geocoding Normalization**.

---

## 1. GPS Reverse Geocoding

Send any latitude and longitude coordinates in Cambodia:

```http
GET https://opengeo-cambodia.pphat.me/api/geocode/reverse?lat=11.5714&lon=104.9250
```

**Response (200 OK):**
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
  "meta": {
    "tookMs": 142.3,
    "source": "nominatim"
  }
}
```

Notice the structured `hierarchy` object: regardless of how the raw upstream provider formatted the address, OpenGeo Cambodia standardizes it into the canonical 4-tier Cambodian model (`province`, `district`, `commune`, `village`).

---

## 2. Address Search Autocomplete

When a user begins typing an address, landmark, or point of interest into a search field:

```http
GET https://opengeo-cambodia.pphat.me/api/geocode/search?q=Wat+Phnom&limit=5
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "displayName": "Wat Phnom, Daun Penh, Phnom Penh, 120201, Cambodia",
      "lat": 11.57608,
      "lon": 104.92305,
      "hierarchy": {
        "province": "Phnom Penh",
        "district": "Doun Penh",
        "commune": "Voat Phnum",
        "village": null,
        "country": "Cambodia"
      }
    }
  ],
  "meta": {
    "total": 1,
    "tookMs": 165.2,
    "source": "nominatim"
  }
}
```

---

## 3. Reverse Geocode vs Boundary Zone: When to Use Which?

Developers often ask when to use `/api/geocode/reverse` versus `/api/boundaries/zone`:

| Feature | `/api/geocode/reverse` | `/api/boundaries/zone` |
| :--- | :--- | :--- |
| **Primary Goal** | Human-readable street address & landmark | Administrative boundary polygon & jurisdiction |
| **Response Time** | ~100ms – 250ms (Upstream Nominatim) | **< 1ms (In-Memory Spatial Index)** |
| **Output** | Street name, house number, landmark | Exact Province, District, Commune codes & GeoJSON |
| **Offline / Edge** | Requires internet access | **100% In-Memory / Edge Capable** |
| **Ideal For** | "Where is the customer standing?" | "Which delivery zone / tax jurisdiction is this?" |

---

## Up Next

In **[Part 6: Practical Integration Guide — TypeScript, Python & Leaflet](../reference/06-developer-integration-and-examples.md)**, we walk through production-ready code examples connecting OpenGeo Cambodia with frontend dropdowns, data science pipelines, and interactive maps.

---

[← Previous: Part 4 — Boundaries & Point-in-Polygon](../boundaries/04-boundaries-and-point-in-polygon.md) | [Next: Part 6 — Developer Integration Guide →](../reference/06-developer-integration-and-examples.md)
