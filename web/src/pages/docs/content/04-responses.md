## Responses & Status Codes {#responses}

Every API response returns a predictable JSON structure with standard HTTP status codes. Successful responses include a `data` field alongside pagination and cache timing metadata in `meta`.

### Successful Response (200 OK)

```json
{
  "success": true,
  "data": [ /* records */ ],
  "meta": { "total": 1, "source": "local_cache" }
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
| `400` | Bad Request — Malformed query parameter or invalid format type. |
| `404` | Not Found — Resource or ID does not exist in administrative index. |
| `405` | Method Not Allowed — Only GET requests are accepted across all endpoints. |
| `429` | Rate Limit Exceeded — Check `Retry-After` header before retrying. |
| `502` | Upstream Error — Nominatim geocoding gateway unavailable or timed out. |
