## GeocodeResult {#model-geocode-h}

Structured geographic address lookup resolved through OpenStreetMap Nominatim and matched to Cambodia's hierarchy.

| Field | Type | Description |
| :--- | :--- | :--- |
| `displayName` | `string` | Full human-readable address string returned from geocoding. |
| `lat`, `lon` | `number` | Geographic latitude and longitude coordinates. |
| `hierarchy` | `object` | Matched Cambodia administrative units (province, district, commune, village). |
| `osmId`, `osmType` | `number`, `string` | OpenStreetMap entity identifier and type (`node`, `way`, `relation`). |
| `type`, `importance` | `string`, `number` | Category classification and Nominatim search relevance rank. |
| `rawAddress` | `object` | Raw address dictionary directly from upstream OpenStreetMap data. |
