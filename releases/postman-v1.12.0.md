# OpenGeo Cambodia API v1.12.0: batch point lookups and point counts

This release adds two Boundaries requests for working with many GPS coordinates at once. It also changes how `level=all` results are returned from the new count request. Changes since v1.9.0:

## New requests

### Boundary zones by multiple coordinates

`GET /api/boundaries/zones?points=lat,lng;lat,lng;...`

Resolves up to 100 points in one call instead of looping over `/zone`.

- Separate pairs with `;` or `|`. Each pair is **latitude, longitude**.
- `level`: `all` (default), `province`, `district` or `commune`.
- `format=summary` returns one result per point, in input order.
- `format=geojson` returns a FeatureCollection with each boundary listed once. Its `properties.point_indexes` gives the input points that fell inside it.

### Count points per boundary

`POST /api/boundaries/zones/count`, with body `{"latlngs":[{"lat":11.576,"lng":104.923}, ...]}`

`GET /api/boundaries/zones/count?at=lat,lng;lat,lng;...`

Counts how many coordinates fall in each boundary, such as customers per commune or orders per province.

- POST takes up to **10,000 points**, with a JSON body of at most 1 MB. GET takes up to 100.
- Points can be given as `{lat,lng}`, `{lat,lon}`, `{latitude,longitude}` or `[lat,lng]`.
- `level`: `commune` (default), `district`, `province` or `all`.
- `sort=count` puts the largest first.
- `format=geojson` returns the matched polygons, with `count` in each feature's properties.
- Each row in `data` is `{ index, level, count, point, matched, <level>: { ... } }`. `point` is the first input coordinate that fell in that boundary.
- Points outside Cambodia are grouped into one final `matched: false` row, whose `point_indexes` lists the input points that didn't match.
- `meta` reports `total`, `matched`, `unmatched` and `groups`.

## Changed in v1.12.0

- **`level=all` on `/zones/count` returns a tree.** Each province row has a `districts` list, and each district has a `communes` list. Every node keeps its own `count`, and `sort=count` sorts every list. The top-level counts add up to the number of points sent. `format=geojson` stays a flat list of features.
- **On `/zones/count`, invalid `level` or `format` values now return `400`** instead of being ignored. Accepted values are listed in the request's description.

## Collection updates

- The new requests come with saved example responses and test scripts.
- The "Count points per boundary" request has a disabled `format=geojson` parameter. Enable it to get polygons.
- The version in the example responses for `API root` and `API index` is now `1.12.0`.

## Compatibility

Existing requests are unchanged. The only response shape that changed is `level=all` on `/zones/count`, which first shipped in v1.11.0. If you read that flat list, walk the `districts` and `communes` lists instead.

No API key is needed. Send a `User-Agent` header. Docs: https://opengeo-cambodia.pphat.me/docs
