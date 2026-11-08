## AdminItem {#model-admin-h}

The foundational entity representing any administrative unit across all 4 tiers in Cambodia.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique numeric identifier for the administrative record. |
| `code` | `string` | Authoritative official code (2 digits for province, 4 for district, 6 for commune, 8 for village). |
| `name` | `string` | Display name (defaults to English in English locale, Khmer in Khmer locale). |
| `name_en` | `string` | Standard Latin transcription of the administrative unit. |
| `name_km` | `string` | Official native Khmer name in standard Khmer script. |
| `level` | `"province" \| "district" \| "commune" \| "village"` | Hierarchy tier level classification. |
| `typeKm` | `string` | Administrative classification in Khmer (e.g. រាជធានី, ខេត្ត, ក្រុង, ស្រុក, ខណ្ឌ, ឃុំ, សង្កាត់, ភូមិ). |
| `parentId` | `number?` | Pointer to the parent unit's `id` (null for top-level provinces). |
| `lat`, `lon` | `number?` | Geographic centroid coordinates (WGS84 EPSG:4326). |

> **Internal Fields Note**: When using search or deep traversal, records may include `norm_en`, `norm_km`, or `tokens` fields used internally for fuzzy search indexing.
