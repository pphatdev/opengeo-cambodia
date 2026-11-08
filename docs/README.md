# Building with OpenGeo Cambodia — A 7-Part Deep Dive

Welcome to the comprehensive technical blog series on **[OpenGeo Cambodia](https://opengeo-cambodia.pphat.me)** — the free, open-source, sub-millisecond geography and administrative boundary API for Cambodia.

This series covers everything from the motivation behind the project and Cambodia's 4-tier administrative domain model to sub-millisecond in-memory spatial indexing, Point-in-Polygon boundary queries, and AI agent integration.

---

## Categories & Series Table of Contents

| Category | Part | Title | Focus Topics |
| :--- | :--- | :--- | :--- |
| **[getting-started/](getting-started/README.md)** | **[Part 1](getting-started/01-introduction-and-domain-model.md)** | **[The Cambodia Address Problem & 4-Tier Administrative Model](getting-started/01-introduction-and-domain-model.md)** | The address problem in Cambodia, the 3 core pillars, official MEF dataset, 25 provinces, 210 districts, 1,661 communes, 14,576 villages, and NCDD codes. |
| **[system/](system/README.md)** | **[Part 2](system/02-architecture-and-performance.md)** | **[Under the Hood: Architecture & Sub-Millisecond Indexing](system/02-architecture-and-performance.md)** | In-memory hash maps ($O(1)$ lookups), spatial 2D bounding-box filtering, ray-casting point-in-polygon algorithms, and dual edge runtime (Cloudflare Workers & Node.js). |
| **[administrative/](administrative/README.md)** | **[Part 3](administrative/03-administrative-hierarchy-api.md)** | **[Administrative Hierarchy & Search API](administrative/03-administrative-hierarchy-api.md)** | Cascading endpoints (`/provinces`, `/districts`, `/communes`, `/villages`), single-call full-tree resolution (`/hierarchy/:id`), and diacritic-insensitive bilingual search. |
| **[boundaries/](boundaries/README.md)** | **[Part 4](boundaries/04-boundaries-and-point-in-polygon.md)** | **[High-Resolution Boundaries & Point-in-Polygon Engine](boundaries/04-boundaries-and-point-in-polygon.md)** | Resolving boundary zones from raw GPS coordinates in <1ms (`/api/boundaries/zone`), GeoJSON polygon queries, summary modes, and bulk downloads. |
| **[geocoding/](geocoding/README.md)** | **[Part 5](geocoding/05-geocoding-and-reverse-lookup.md)** | **[Smart Reverse Geocoding & Address Autocomplete](geocoding/05-geocoding-and-reverse-lookup.md)** | GPS point reverse geocoding (`/api/geocode/reverse`), normalizing OpenStreetMap Nominatim outputs into canonical 4 tiers, and free-text autocomplete. |
| **[reference/](reference/README.md)** | **[Part 6](reference/06-developer-integration-and-examples.md)** | **[Practical Integration Guide: TypeScript, Python & Leaflet](reference/06-developer-integration-and-examples.md)** | Production-ready code: Vanilla TypeScript cascading dropdowns, Python GeoPandas spatial analysis and mapping, and Leaflet vector polygon rendering. |
| **[reference/](reference/README.md)** | **[Part 7](reference/07-ai-agents-and-llms.md)** | **[AI Agent Integration: Powering LLMs with llms.txt](reference/07-ai-agents-and-llms.md)** | Adopting the llmstxt.org standard, `/llms.txt` and `/llms-full.txt`, configuring Cursor `.cursorrules` and Claude, Postman collection, and community links. |

---

## Prefer a Single Full-Length Post?

If you prefer reading the entire guide in a single comprehensive document, see:
* **[`introducing-opengeo-cambodia.md`](introducing-opengeo-cambodia.md)**

---

## Quick Links

- 🌐 **Live Website & Interactive Map Explorer**: [https://opengeo-cambodia.pphat.me](https://opengeo-cambodia.pphat.me)
- 📚 **Interactive API Documentation**: [https://opengeo-cambodia.pphat.me/docs](https://opengeo-cambodia.pphat.me/docs)
- 📮 **Postman Collection**: [`opengeo-cambodia.postman_collection.json`](https://opengeo-cambodia.pphat.me/opengeo-cambodia.postman_collection.json)
- 🤖 **AI Assistant Context**: [`/llms.txt`](https://opengeo-cambodia.pphat.me/llms.txt)
- 🐙 **GitHub Repository**: [https://github.com/pphatdev/opengeo-cambodia](https://github.com/pphatdev/opengeo-cambodia)
