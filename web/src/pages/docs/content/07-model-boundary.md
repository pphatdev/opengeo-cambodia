## BoundaryFeature {#model-boundary-h}

A GeoJSON Feature: polygon `geometry` plus these `properties`. With `format=summary` you get the same fields as a plain object, without `geometry`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Numeric form of the code (e.g. `120101`). |
| `code`, `pcode` | `string` | Zero-padded code (e.g. `070203`) and its P-code (`KH070203`). |
| `name` | `string` | Display name (English). |
| `name_en`, `name_km`, `type_km` | `string` | English name, Khmer script name, and administrative classification. |
| `level` | `string` | Administrative boundary tier (`"province"`, `"district"`, or `"commune"`). |
| `province_code`, `province_name_en`, `province_name_km` | `string` | Top-level parent province information. |
| `district_code`, `district_name_en`, `district_name_km` | `string?` | Parent district (commune boundaries only). |
| `lat`, `lon` | `number` | Calculated geometric centroid coordinate for the polygon. |
| `bbox` | `[minLon, minLat, maxLon, maxLat]` | Bounding box coordinates in EPSG:4326 format. |
| `shape_length`, `shape_area` | `number` | Perimeter and area of the polygon, in degrees (from the source shapefile). |
