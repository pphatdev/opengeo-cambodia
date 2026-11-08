## Concepts & 4-Tier Hierarchy

Cambodia's administrative structure follows an authoritative 4-tier tree. Every lower tier inherits its parent's code as a prefix and appends two digits:

```text
[12]             Province: Phnom Penh (រាជធានីភ្នំពេញ)
 └── [1201]          District: Chamkar Mon (ខណ្ឌចំការមន)
      └── [120101]       Commune: Tonle Basak (សង្កាត់ទន្លេបាសាក់)
           └── [12010101]    Village: Phum 1 (ភូមិ១)
```

| Level | Khmer Title | Code | Count | Boundaries Available |
| :--- | :--- | :--- | :--- | :--- |
| **Province** | រាជធានី · ខេត្ត | `12` | 25 | 25 Polygons |
| **District** | ក្រុង · ស្រុក · ខណ្ឌ | `1201` | 210 | 197 Polygons |
| **Commune** | ឃុំ · សង្កាត់ | `120101` | 1,661 | 1,633 Polygons |
| **Village** | ភូមិ | `12010101` | 14,576 | Centroid Points Only |

> **Boundary Coverage Note**: Official GeoJSON polygon boundaries exist for all 25 provinces, 197 districts (13 newly created districts share parent geometry), and 1,633 communes (28 newly established communes share parent geometry). Villages are represented by geographic centroid coordinates.
