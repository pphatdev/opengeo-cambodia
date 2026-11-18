## Rate Limits & Headers {#rate-limits}

To guarantee high availability and protect upstream resources, limits are enforced per client IP address on a rolling 60-second window.

### Tier Limits

| Endpoints | Rate Limit | Reason |
| :--- | :--- | :--- |
| `/api/admin/*`, `/api/boundaries/*` | 10,000 / min | Pre-indexed in memory; no database or upstream call. |
| `/api/admin/search` | 120 / min | In-memory full-text and phonetic fuzzy search index. |
| `/api/geocode/*` | 30 / min | Nominatim upstream fair-use policy adherence. |
| Other API endpoints | 5,000 / min | Standard rate limit for system and discovery endpoints. |

### Response Headers

| Header | Description |
| :--- | :--- |
| `X-RateLimit-Limit` | Number of requests allowed in the current rate limiting window. |
| `X-RateLimit-Remaining` | Remaining request quota available in the active 60-second window. |
| `Retry-After` | Sent with `429`: seconds to wait before the next request. |
| `X-RateLimit-Reset` | Unix epoch timestamp (in seconds) when the current window resets. |
| `X-Response-Time` | Server time spent on the request (e.g. `0.23ms`); sent by admin and boundary endpoints. |
| `Cache-Control` / `ETag` | Caching headers; send `If-None-Match` with the `ETag` to get a `304 Not Modified`. |

> **Pro Tip**: If your application performs bulk data ingestion or requires offline access, download the pre-packaged CSV and GeoJSON datasets from [Downloads](#downloads) instead of scraping endpoints. For many coordinates, use the batch endpoints (`/api/boundaries/zones`, `/api/boundaries/zones/count`) rather than one request per point.

