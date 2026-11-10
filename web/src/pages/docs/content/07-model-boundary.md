## BoundaryFeature {#model-boundary-h}

GeoJSON Feature with rich boundary geometry and administrative properties.

| Field | Type | Description |
| :--- | :--- | :--- |
| `code`, `pcode` | `string` | Zero-padded administrative boundary code (e.g. `070203`). |
| `name_en`, `name_km`, `type_km` | `string` | English name, Khmer script name, and administrative classification. |
| `level` | `string` | Administrative boundary tier (`"province"`, `"district"`, or `"commune"`). |
| `province_code`, `province_name_en`, `province_name_km` | `string` | Top-level parent province information. |
| `district_code`, `district_name_en`, `district_name_km` | `string?` | Intermediate parent district information (for commune boundaries). |
| `lat`, `lon` | `number` | Calculated geometric centroid coordinate for the polygon. |
| `bbox` | `[minLon, minLat, maxLon, maxLat]` | Bounding box coordinates in EPSG:4326 format. |
| `shape_length`, `shape_area` | `number` | Perimeter length and geographic surface area of the polygon geometry. |
