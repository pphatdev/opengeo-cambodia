## Boundaries {#boundaries-h}

Polygons for provinces, districts and communes. List endpoints return GeoJSON by default. Add `format=summary` to get lightweight JSON with centroids and bounding boxes but no coordinates. Boundary endpoints take the zero-padded code (e.g. `070203`) or P-code (`KH070203`), not the numeric id.

Point lookups resolve GPS coordinates to the area containing them: `/zone` for one point, `/zones` for up to 100 points, and `/zones/count` to count up to 10,000 points per area (customers per commune, shops per district).
