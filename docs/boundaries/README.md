# Boundaries & Point-in-Polygon Spatial Engine

This section covers high-resolution GeoJSON boundary polygons, spatial filtering, and the sub-millisecond Point-in-Polygon (PIP) boundary zone lookup engine.

## Chapters in this Category
- **[04-boundaries-and-point-in-polygon.md](04-boundaries-and-point-in-polygon.md)**: High-Resolution Boundaries & Point-in-Polygon Spatial Engine

## Key Concepts
- **Point-in-Polygon**: `/api/boundaries/zone?lat=...&lng=...` resolving containing boundary polygons in < 1ms.
- **Nested Boundary Paths**: `/api/boundaries/provinces/:pCode/districts/:dCode/communes`.
- **Lightweight Summaries**: `format=summary` for 99% bandwidth savings.
- **Bulk GeoJSON Downloads**: Standalone files for QGIS, GeoPandas, and PostGIS imports.

[← Previous: Administrative API](../administrative/03-administrative-hierarchy-api.md) | [Next: Reverse Geocoding →](../geocoding/05-geocoding-and-reverse-lookup.md)

