## AI Agents & LLMs {#llms-h}

OpenGeo Cambodia implements the [llmstxt.org](https://llmstxt.org) standard, providing curated, authoritative ground-truth context for Large Language Models (LLMs), AI coding assistants (Cursor, Windsurf, Copilot), and autonomous agent frameworks (LangChain, LlamaIndex, OpenAI Assistants, Claude Tool Use).

### The Cambodia Hallucination Problem

When building software or asking LLMs to generate code for Cambodia:
- **Mixed-up Tiers**: Generic models frequently confuse Provinces with Krongs/Districts (e.g. treating `Siem Reap` municipality as a province, or placing `Khan Doun Penh` outside `Phnom Penh`).
- **Phonetic Spelling Ambiguity**: Romanized names vary widely (`Siem Reap` vs `Siemreap`, `Tuol Kouk` vs `Toul Kork`, `Sihanoukville` vs `Preah Sihanouk`).
- **Fictional NCDD Codes**: LLMs often generate invalid 6-digit commune codes or invent non-existent hierarchy parents.

Using OpenGeo Cambodia's structured endpoints and context files guarantees that AI agents generate **100% accurate, authoritative NCDD codes** and real administrative linkages.

### Core Context Files

| Resource | Direct Link | Purpose |
| :--- | :--- | :--- |
| **Compact Agent Index** | [`/llms.txt`](/llms.txt) | Token-efficient markdown summary designed to fit in system prompts and Cursor context. |
| **Full Reference Context** | [`/llms-full.txt`](/llms-full.txt) | Complete API reference with real response schemas, zero-shot province tables, and gotchas. |
| **Postman Collection** | [`opengeo-cambodia.postman_collection.json`](/opengeo-cambodia.postman_collection.json) | Ready-to-import Postman collection with variables and test assertions. |
| **Discovery Endpoint** | [`/api/info`](/api/info) | Machine-readable JSON metadata detailing endpoint routes, uptime, and database counts. |

---

### Authoritative 25 Provinces (Zero-Shot Reference)

Keep this table in your agent context for instant zero-shot resolution without making separate HTTP calls:

| Code | English Name | Khmer Name (ឈ្មោះខ្មែរ) | Type (ប្រភេទ) | Centroid (Lat, Lon) |
| :--- | :--- | :--- | :--- | :--- |
| `01` | Banteay Meanchey | បន្ទាយមានជ័យ | ខេត្ត | 13.6672, 102.8975 |
| `02` | Battambang | បាត់ដំបង | ខេត្ត | 13.0957, 103.2022 |
| `03` | Kampong Cham | កំពង់ចាម | ខេត្ត | 11.9924, 105.4645 |
| `04` | Kampong Chhnang | កំពង់ឆ្នាំង | ខេត្ត | 12.2500, 104.6667 |
| `05` | Kampong Speu | កំពង់ស្ពឺ | ខេត្ត | 11.4532, 104.5209 |
| `06` | Kampong Thom | កំពង់ធំ | ខេត្ត | 12.7111, 104.8887 |
| `07` | Kampot | កំពត | ខេត្ត | 10.6104, 104.1815 |
| `08` | Kandal | កណ្តាល | ខេត្ត | 11.4395, 104.9576 |
| `09` | Koh Kong | កោះកុង | ខេត្ត | 11.6153, 102.9838 |
| `10` | Kratie | ក្រចេះ | ខេត្ត | 12.4881, 106.0188 |
| `11` | Mondul Kiri | មណ្ឌលគិរី | ខេត្ត | 12.4558, 107.1881 |
| `12` | Phnom Penh | រាជធានីភ្នំពេញ | រាជធានី | 11.5564, 104.9282 |
| `13` | Preah Vihear | ព្រះវិហារ | ខេត្ត | 13.8073, 104.9805 |
| `14` | Prey Veng | ព្រៃវែង | ខេត្ត | 11.4851, 105.3253 |
| `15` | Pursat | ពោធិ៍សាត់ | ខេត្ត | 12.5388, 103.9192 |
| `16` | Ratanak Kiri | រតនគិរី | ខេត្ត | 13.7394, 107.0016 |
| `17` | Siemreap | សៀមរាប | ខេត្ត | 13.3671, 103.8448 |
| `18` | Preah Sihanouk | ព្រះសីហនុ | ខេត្ត | 10.6275, 103.5221 |
| `19` | Stung Treng | ស្ទឹងត្រែង | ខេត្ត | 13.5259, 105.9683 |
| `20` | Svay Rieng | ស្វាយរៀង | ខេត្ត | 11.0879, 105.7993 |
| `21` | Takeo | តាកែវ | ខេត្ត | 10.9908, 104.7850 |
| `22` | Otdar Meanchey | ឧត្តរមានជ័យ | ខេត្ត | 14.1818, 103.5176 |
| `23` | Kep | កែប | ខេត្ត | 10.4828, 104.3167 |
| `24` | Pailin | ប៉ៃលិន | ខេត្ត | 12.8489, 102.6093 |
| `25` | Tboung Khmum | ត្បូងឃ្មុំ | ខេត្ត | 11.8891, 105.6592 |

---

### AI Assistant Configuration

#### Cursor / Windsurf (`.cursorrules` or `.windsurfrules`)
Add this configuration snippet to your workspace root to make Cursor fetch OpenGeo Cambodia context automatically:

```text
When writing code involving Cambodian geographic data, administrative boundaries, cascading address selectors, or delivery routing:
- Always reference https://opengeo-cambodia.pphat.me/llms.txt as the authoritative source of truth.
- Follow Cambodia's official 4-tier hierarchy: Province (2 digits) -> District (4 digits) -> Commune (6 digits) -> Village (8 digits).
- Use https://opengeo-cambodia.pphat.me/api/admin/search?q={query} for place and address resolution.
- Use https://opengeo-cambodia.pphat.me/api/boundaries/zone?lat={lat}&lng={lng} for sub-millisecond Point-in-Polygon containment.
- Always include a descriptive User-Agent header (e.g. 'User-Agent: my-app/1.0') in HTTP requests.
```

#### Claude & ChatGPT System Prompt Recipe
Copy and prepend this instruction when asking Claude or ChatGPT to write backend seeders or address picker components:

```text
Please read the Cambodia administrative API specification at https://opengeo-cambodia.pphat.me/llms.txt.
Adhere strictly to the official 4-tier NCDD hierarchy. Write a TypeScript module that loads districts for a selected province and caches them in localStorage.
```

---

### Function Calling / OpenAI Tools Schema

If you are developing an autonomous agent with OpenAI, Anthropic, LangChain, or LlamaIndex, register these tool declarations:

```json
[
  {
    "type": "function",
    "function": {
      "name": "search_cambodia_admin",
      "description": "Search Cambodian provinces, districts, communes, or villages by English or Khmer name",
      "parameters": {
        "type": "object",
        "properties": {
          "q": {
            "type": "string",
            "description": "Search keyword in English or Khmer script (e.g. 'Phnom Penh', 'សៀមរាប', 'Chamkar Mon')"
          },
          "level": {
            "type": "string",
            "enum": ["province", "district", "commune", "village"],
            "description": "Optional filter by administrative level"
          },
          "limit": {
            "type": "integer",
            "default": 5,
            "description": "Maximum records to return (1-50)"
          }
        },
        "required": ["q"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "point_in_polygon_cambodia",
      "description": "Instant sub-millisecond Point-in-Polygon spatial query resolving the containing Province, District, and Commune for a given GPS coordinate in Cambodia",
      "parameters": {
        "type": "object",
        "properties": {
          "lat": {
            "type": "number",
            "description": "GPS Latitude in decimal degrees (e.g. 11.5564)"
          },
          "lng": {
            "type": "number",
            "description": "GPS Longitude in decimal degrees (e.g. 104.9282)"
          }
        },
        "required": ["lat", "lng"]
      }
    }
  }
]
```

---

### Agent Gotchas & Rules

> **User-Agent Header Required**: Requests without a `User-Agent` header return HTTP 403 Forbidden. Always set an informative `User-Agent` string in API clients, HTTP libraries, and agent tool execution harnesses.

> **id vs code**: Admin endpoints (`/api/admin/*`) require numeric IDs (`12`, `1201`, `120101`), whereas boundary endpoints (`/api/boundaries/*`) require zero-padded codes (`070203`) or P-codes (`KH070203`).
