## AdminItem {#model-admin-h}

The foundational entity representing any administrative unit across all 4 tiers in Cambodia.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique numeric identifier for the administrative record. |
| `code` | `string` | Authoritative official code (2 digits for province, 4 for district, 6 for commune, 8 for village). |
| `name` | `string` | Display name (currently the English name). |
| `name_en` | `string` | Standard Latin transcription of the administrative unit. |
| `name_km` | `string` | Official native Khmer name in standard Khmer script. |
| `level` | `"province" \| "district" \| "commune" \| "village"` | Hierarchy tier level classification. |
| `typeKm` | `string` | Administrative classification in Khmer (e.g. រាជធានី, ខេត្ត, ក្រុង, ស្រុក, ខណ្ឌ, ឃុំ, សង្កាត់, ភូមិ). |
| `parentId` | `number?` | The parent unit's `id`; omitted on provinces. |
| `lat`, `lon` | `number?` | Geographic centroid coordinates (WGS84 EPSG:4326). |

> **Internal fields**: records may also include `_normEn`, `_normKm` and `_normName`, normalised strings used by the search index. Ignore them; they can change without notice.
