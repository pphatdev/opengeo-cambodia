## Responses & Status Codes {#responses}

Every API response returns a predictable JSON structure with standard HTTP status codes. Successful responses carry the payload in `data`; list endpoints add a `meta` object with the total count, the data sync time and the source.

### Successful Response (200 OK)

```json
{
  "success": true,
  "data": [ /* records */ ],
  "meta": { "total": 25, "timestamp": "…", "source": "local_cache" }
}
```

### Error Response (4xx / 5xx)

```json
{
  "success": false,
  "data": null,
  "error": "Item not found"
}
```

### HTTP Status Codes

| Status | Meaning |
| :--- | :--- |
| `200` | OK — Request succeeded and payload returned in `data`. |
| `400` | Bad Request — Malformed or out-of-range parameter (coordinates, `level`, `format`, point list). |
| `403` | Forbidden — The request has no `User-Agent` header, or matched a blocked exploit pattern. |
| `404` | Not Found — Resource or ID does not exist in administrative index. |
| `405` | Method Not Allowed — The API is read-only: GET everywhere, plus `POST /api/boundaries/zones/count`. |
| `413` | Payload Too Large — `POST /api/boundaries/zones/count` body over 1 MB. |
| `429` | Rate Limit Exceeded — Check `Retry-After` header before retrying. |
| `502` / `503` | Upstream Error — Nominatim geocoding unavailable or timed out. |

