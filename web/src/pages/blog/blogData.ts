export interface BlogPostMeta {
    slug: string;
    part: number;
    title: string;
    titleKm: string;
    description: string;
    descriptionKm: string;
    readTime: string;
    tags: string[];
    date: string;
    highlights: string[];
    apiEndpoints?: string[];
}

export const BLOG_POSTS: BlogPostMeta[] = [
    {
        slug: "01-introduction-and-domain-model",
        part: 1,
        title: "The Cambodia Address Problem & 4-Tier Administrative Model",
        titleKm: "បញ្ហាអាសយដ្ឋានកម្ពុជា និងគំរូឋានានុក្រម ៤ ថ្នាក់",
        description: "Why Cambodian geographic data has historically been broken, and how OpenGeo Cambodia models the authoritative 4-tier administrative hierarchy.",
        descriptionKm: "មូលហេតុដែលទិន្នន័យភូមិសាស្ត្រកម្ពុជាពីមុនមានភាពស្មុគស្មាញ និងរបៀបដែល OpenGeo Cambodia រៀបចំគំរូ ៤ ថ្នាក់ផ្លូវការ។",
        readTime: "4 min read",
        tags: ["Domain Model", "MEF Data", "NCDD Codes", "Open Source"],
        date: "2026-11-08",
        highlights: [
            "25 Provinces & Capital (រាជធានី / ខេត្ត)",
            "210 Districts, Khans & Krongs (ស្រុក / ខណ្ឌ / ក្រុង)",
            "1,661 Communes & Sangkats (ឃុំ / សង្កាត់)",
            "14,576 Villages (ភូមិ)",
        ],
        apiEndpoints: ["/api/admin/stats", "/api/admin/provinces"],
    },
    {
        slug: "02-architecture-and-performance",
        part: 2,
        title: "Under the Hood: Architecture & Sub-Millisecond In-Memory Indexing",
        titleKm: "ស្ថាបត្យកម្មប្រព័ន្ធ និងការបង្កើតលិបិក្រមក្នុងអង្គចងចាំក្រោម ១ មិល្លីវិនាទី",
        description: "How OpenGeo Cambodia eliminates database bottlenecks using in-memory O(1) hash maps, spatial bounding-box indexing, and edge caching.",
        descriptionKm: "របៀបដែល OpenGeo Cambodia បំបាត់បញ្ហាកកស្ទះទិន្នន័យដោយប្រើ O(1) Hash Map និង Spatial Bounding Box។",
        readTime: "5 min read",
        tags: ["Architecture", "Performance", "Cloudflare Workers", "TypeScript"],
        date: "2026-11-08",
        highlights: [
            "Sub-millisecond (< 1ms) response times from RAM",
            "Zero database connection overhead or disk I/O latency",
            "2-Tier spatial index: O(1) BBox pre-filter + ray casting",
            "Dual runtime portability: Cloudflare Workers Edge (300+ PoPs) & Node.js",
        ],
        apiEndpoints: ["/health", "/api/info"],
    },
    {
        slug: "03-administrative-hierarchy-api",
        part: 3,
        title: "Administrative Hierarchy & Nested Search API",
        titleKm: "ឋានានុក្រមរដ្ឋបាល និង API ស្វែងរកតាមផ្លូវកាត់ និងផ្លូវ Nesting",
        description: "A comprehensive guide to OpenGeo Cambodia's administrative endpoints, cascading queries, full-tree resolution, and bilingual search.",
        descriptionKm: "ការណែនាំលម្អិតអំពី Endpoint ឋានានុក្រមរដ្ឋបាល ការស្វែងរកទ្វេភាសា និងផ្លូវ Nesting ពេញលេញ។",
        readTime: "5 min read",
        tags: ["REST API", "Cascading Dropdowns", "Search", "Hierarchy"],
        date: "2026-11-08",
        highlights: [
            "Cascading endpoints: /provinces → /districts → /communes → /villages",
            "Nested REST paths: /provinces/:pId/districts/:dId/communes/:cId/villages",
            "Single-call full ascending tree resolution via /hierarchy/:id",
            "Bilingual search engine tolerant of Khmer script, Romanization, and accents",
        ],
        apiEndpoints: [
            "/api/admin/provinces",
            "/api/admin/provinces/12/districts",
            "/api/admin/hierarchy/12020101",
            "/api/admin/search?q=Doun+Penh",
        ],
    },
    {
        slug: "04-boundaries-and-point-in-polygon",
        part: 4,
        title: "High-Resolution Boundaries & Point-in-Polygon Spatial Engine",
        titleKm: "ព្រំប្រទល់ភូមិសាស្ត្រ និងម៉ាស៊ីនស្វែងរកតំបន់តាមកូអរដោនេ Point-in-Polygon",
        description: "Resolving administrative boundary zones from raw GPS coordinates in sub-milliseconds and serving clean GeoJSON polygon datasets.",
        descriptionKm: "ការកំណត់តំបន់ព្រំប្រទល់ពីរង្វាស់ GPS ក្នុងរយៈពេលក្រោម ១ មិល្លីវិនាទី និងការទាញយក GeoJSON។",
        readTime: "6 min read",
        tags: ["GeoJSON", "Point-in-Polygon", "Spatial Index", "GIS"],
        date: "2026-11-08",
        highlights: [
            "Sub-1ms Point-in-Polygon lookup via /api/boundaries/zone?lat=...&lng=...",
            "Nested boundary paths: /provinces/:pCode/districts/:dCode/communes",
            "Lightweight metadata summary mode (format=summary) with 99% bandwidth savings",
            "Bulk raw GeoJSON downloads for provinces, districts, and communes",
        ],
        apiEndpoints: [
            "/api/boundaries/zone?lat=11.57608&lng=104.92305",
            "/api/boundaries/provinces",
            "/api/boundaries/districts?province_code=12",
        ],
    },
    {
        slug: "05-geocoding-and-reverse-lookup",
        part: 5,
        title: "Smart Reverse Geocoding & Address Autocomplete",
        titleKm: "ការបំលែងកូអរដោនេបញ្ច្រាស និងការបំពេញអាសយដ្ឋានស្វ័យប្រវត្តិ",
        description: "How OpenGeo Cambodia normalizes raw OpenStreetMap and Nominatim data into clean 4-tier Cambodian administrative addresses.",
        descriptionKm: "របៀបដែល OpenGeo Cambodia កែសម្រួលទិន្នន័យ OpenStreetMap ទៅជាទម្រង់រដ្ឋបាលកម្ពុជា ៤ ថ្នាក់។",
        readTime: "4 min read",
        tags: ["Geocoding", "Nominatim", "OpenStreetMap", "Address Autocomplete"],
        date: "2026-11-08",
        highlights: [
            "Reverse geocode GPS coordinates into clean 4-tier administrative hierarchy",
            "Fallback normalizer harmonizing suburbs, quarters, and counties into Sangkats/Khums",
            "Free-text address search and autocomplete via /api/geocode/search",
        ],
        apiEndpoints: [
            "/api/geocode/reverse?lat=11.5714&lon=104.9250",
            "/api/geocode/search?q=Wat+Phnom",
        ],
    },
    {
        slug: "06-developer-integration-and-examples",
        part: 6,
        title: "Practical Integration Guide: TypeScript, Python & Leaflet",
        titleKm: "ការណែនាំអនុវត្តផ្ទាល់៖ TypeScript, Python និង Leaflet",
        description: "Step-by-step code implementations for cascading address dropdowns, spatial data science with GeoPandas, and Leaflet map rendering.",
        descriptionKm: "កូដអនុវត្តជាក់ស្តែងសម្រាប់ Address Dropdown, Python GeoPandas, និងផែនទី Leaflet។",
        readTime: "7 min read",
        tags: ["TypeScript", "Python", "GeoPandas", "Leaflet", "Tutorial"],
        date: "2026-11-08",
        highlights: [
            "Zero-dependency Vanilla TypeScript cascading address selector pattern",
            "1-line GeoPandas GeoDataFrame loading and matplotlib choropleth plotting",
            "Interactive Leaflet vector layer styling with hover effects and popups",
        ],
    },
    {
        slug: "07-ai-agents-and-llms",
        part: 7,
        title: "AI Agent Integration: Powering LLMs with llms.txt",
        titleKm: "ការរួមបញ្ចូលជាមួយ AI Agent៖ ជំនួយដល់ LLM តាមរយៈ llms.txt",
        description: "How OpenGeo Cambodia adopts the llmstxt.org standard to provide ground-truth context to AI coding assistants and autonomous agents.",
        descriptionKm: "របៀបដែល OpenGeo Cambodia ប្រើប្រាស់ស្តង់ដារ llmstxt.org សម្រាប់ Cursor, Claude និង Copilot។",
        readTime: "4 min read",
        tags: ["AI", "LLM", "Cursor", "Claude", "llms.txt", "Developer Tools"],
        date: "2026-11-08",
        highlights: [
            "llmstxt.org open standard compliance for LLMs and autonomous agents",
            "Compact token-efficient context via /llms.txt",
            "Full schema specification with TypeScript interfaces via /llms-full.txt",
            "Direct Cursor .cursorrules and system prompt integration guides",
        ],
        apiEndpoints: ["/llms.txt", "/llms-full.txt"],
    },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
    return BLOG_POSTS.find((p) => p.slug === slug);
}
