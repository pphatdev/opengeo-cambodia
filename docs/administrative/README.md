# Administrative Hierarchy & Search API

This section covers the core administrative endpoints for building cascading address selectors, resolving full ascending hierarchy paths, and bilingual search.

## Chapters in this Category
- **[03-administrative-hierarchy-api.md](03-administrative-hierarchy-api.md)**: Administrative Hierarchy & Nested Search API

## Key Concepts
- **Cascading Dropdowns**: `/api/admin/provinces` → `/districts` → `/communes` → `/villages`.
- **RESTful Nested Routes**: `/api/admin/provinces/:pId/districts/:dId/communes/:cId/villages` with parent-child validation.
- **Single-Call Path Resolution**: `/api/admin/hierarchy/:id` to resolve complete tree from a village ID.
- **Bilingual Search**: Diacritic, spacing, and Romanization tolerant search engine.

[← Previous: System Architecture](../system/02-architecture-and-performance.md) | [Next: Boundaries & Point-in-Polygon →](../boundaries/04-boundaries-and-point-in-polygon.md)

