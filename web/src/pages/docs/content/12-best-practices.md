## Best Practices {#best-practices}

OpenGeo Cambodia is free, keyless and served from Cloudflare's edge. These guidelines keep your integration fast, resilient and friendly to the shared service.

### 1. Cache aggressively, the data is immutable

Administrative and boundary data change only when the government publishes a new gazette. Responses are sent with `Cache-Control: public, max-age=31536000, immutable` and an `ETag`, so:

- **Browsers & CDNs** cache them automatically, so don't add `no-cache` headers or random query strings.
- **Servers** should keep a local copy (memory, Redis, a database table) and refresh it at most weekly.
- **Revalidate cheaply** with `If-None-Match`. An unchanged resource returns `304 Not Modified` with an empty body.

```js
const cache = new Map(); // url → { etag, data }

async function getJson(url) {
  const hit = cache.get(url);
  const res = await fetch(url, { headers: hit ? { "If-None-Match": hit.etag } : {} });
  if (res.status === 304) return hit.data;
  const data = await res.json();
  cache.set(url, { etag: res.headers.get("ETag"), data });
  return data;
}
```

> **Cache-busting has no effect**: unknown query parameters are stripped from the edge cache key, so `?t=123` returns the same cached response. Only documented parameters change the result.

### 2. Respect rate limits and back off on 429

Limits are per IP on a rolling 60-second window (see [Rate limits](#rate-limits)). Read `X-RateLimit-Remaining` to pace bulk jobs, and on `429 Too Many Requests` wait for the number of seconds in `Retry-After` before retrying.

```js
async function fetchWithRetry(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url);
    if (res.status !== 429 && res.status < 500) return res;
    const wait = Number(res.headers.get("Retry-After")) || 2 ** i;
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  throw new Error(`Gave up after ${attempts} attempts: ${url}`);
}
```

- Retry only `429` and `5xx`. A `400` or `404` will fail the same way again.
- Debounce search-as-you-type to around 250 ms. `/api/admin/search` allows 120 requests/min.
- Run batch jobs with low concurrency (2–4 in flight), not hundreds of parallel requests.

### 3. Handle errors from the envelope

Every JSON error has the same shape, `{ "success": false, "data": null, "error": "…" }`. Check the HTTP status first, then show `error` to developers, not end users.

| Status | What to do |
| :--- | :--- |
| `400` | Fix the request: invalid code, coordinates or parameter. Don't retry. |
| `404` | Treat as "no result", e.g. a point in the sea or outside Cambodia. |
| `429` | Wait `Retry-After` seconds, then retry. |
| `502` | The geocoding upstream (Nominatim) is busy. Retry later with backoff. |

### 4. Store codes, not names

Use the official NCDD **code** as your foreign key (`12`, `1201`, `120101`, `12010101`). Names can be re-romanised or corrected; codes stay stable.

- The code encodes the whole hierarchy. For village `12010101`, `code.slice(0, 2)` is the province, `code.slice(0, 4)` the district and `code.slice(0, 6)` the commune, so you rarely need extra lookups to find a parent.
- Codes are digit strings. Keep them as **strings** in your database so leading zeros (`01`–`09` provinces) aren't lost.
- Both `12` and `KH12` (PCODE) are accepted by boundary endpoints. Store the plain code.

### 5. Request only what you need

Boundary polygons are large: all communes as GeoJSON is about 6–7 MB.

| Need | Use |
| :--- | :--- |
| Dropdowns, lists, autocomplete | `/api/admin/*`, or boundaries with `format=summary` (no geometry) |
| One area's outline | `/api/boundaries/item/{code}` |
| A district's communes on a map | `/api/boundaries/communes?district_code=1201` |
| Every polygon, offline | The pre-built files in [Downloads](#downloads) |

Load child levels lazily as the user drills down, instead of fetching all 14,576 villages up front.

### 6. Point lookups: send clean coordinates

`/api/boundaries/zone` resolves a GPS point to its province, district and commune.

- Order is **latitude, longitude**: `?lat=11.5564&lng=104.9282`. GeoJSON uses the opposite order (`[lng, lat]`), which is a common source of bugs.
- Six decimal places (~0.1 m) is more than enough. Round device GPS before sending so identical locations share a cache entry.
- Expect `404` for points offshore, on the border line or in a neighbouring country, and give users a way to pick the area manually.
- Need only one level? Add `level=province` (or `district` / `commune`) and `format=summary` for the smallest response.
- Many points at once (a delivery route, a CSV of shops)? Use `/api/boundaries/zones?points=lat,lng;lat,lng` instead of a loop of `/zone` calls: up to 100 points per request, results in input order.
- Counting points per area (customers per commune, orders per province)? `/api/boundaries/zones/count` takes up to 10,000 points and returns one row per area with its `count`. Send large lists as `POST` with a JSON body (`{"latlngs":[{"lat":…,"lng":…}]}`), since long URLs get cut off by proxies.

### 7. Geocoding etiquette

`/api/geocode/*` proxies OpenStreetMap Nominatim, which has a strict fair-use policy, so it is limited to **30 requests/min**.

- Geocode on an explicit action (submit or blur), never on every keystroke.
- Cache results on your side. Reverse lookups are rounded to ~11 m, so nearby points share a cached answer.
- When you display geocoding results, show the attribution **© OpenStreetMap contributors**.
- For administrative names, prefer `/api/admin/search`. It is faster, needs no upstream call and has a higher limit.

### 8. Display Khmer text correctly

- Every record has `name_en` and `name_km`. Pick by the user's language, and fall back to `name_en`.
- Responses are UTF-8. Make sure your database columns and HTML pages are UTF-8 too (`<meta charset="utf-8">`).
- Use a font with Khmer coverage, such as **Noto Sans Khmer** or **Kantumruy Pro**, and leave extra line height. Khmer has stacked subscript consonants.
- Sort Khmer names with `Intl.Collator("km")` rather than plain string comparison.

### 9. Bulk data: download, don't scrape

For imports, analytics or offline apps, use the CSV and GeoJSON files in [Downloads](#downloads), or the raw endpoints `/api/boundaries/raw/{level}.geojson`. One download replaces thousands of API calls and never touches your rate limit.

### 10. Production checklist

- Calls go to `https://opengeo-cambodia.pphat.me`, the HTTPS origin only.
- Responses are cached client- or server-side, with `ETag` revalidation.
- `429` handling waits `Retry-After`, and retries are capped.
- Codes are stored as strings, and names are display-only.
- Search input is debounced; geocoding runs only on explicit actions.
- OpenStreetMap attribution is shown wherever geocoding results appear.
- Khmer font and UTF-8 work end to end.
- Bulk imports use the downloadable datasets.

> **No API key, no secrets**: CORS is open (`Access-Control-Allow-Origin: *`), so you can call the API straight from the browser. There's nothing to hide in a backend proxy, but a proxy is still a good place to add your own cache.
