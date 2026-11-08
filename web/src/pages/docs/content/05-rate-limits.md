## Rate Limits & Headers {#rate-limits}

To guarantee high availability and protect upstream resources, limits are enforced per client IP address on a rolling 60-second window.

### Tier Limits

| Endpoints | Rate Limit | Reason |
| :--- | :--- | :--- |
| `/api/admin/*`, `/api/boundaries/*` | 10,000 / min | Pre-indexed in RAM; virtually zero CPU or DB overhead. |
| `/api/admin/search` | 120 / min | In-memory full-text and phonetic fuzzy search index. |
| `/api/geocode/*` | 30 / min | Nominatim upstream fair-use policy adherence. |
| Other API endpoints | 5,000 / min | Standard rate limit for system and discovery endpoints. |

### Response Headers

| Header | Description |
| :--- | :--- |
| `X-RateLimit-Limit` | Number of requests allowed in the current rate limiting window. |
| `X-RateLimit-Remaining` | Remaining request quota available in the active 60-second window. |
| `X-RateLimit-Reset` | Unix epoch timestamp (in seconds) when the current window resets. |
| `X-Response-Time` | Time spent executing the request on the server (e.g. `0.23ms`). |
| `Cache-Control` / `ETag` | HTTP 304 Not Modified validation headers for efficient browser caching. |

> **Pro Tip**: If your application performs bulk data ingestion or requires offline access, download the pre-packaged CSV and GeoJSON datasets directly from the Downloads section instead of scraping endpoints.
