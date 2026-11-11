import type { Localized } from "../../i18n";

export type EndpointGroup = "admin" | "boundaries" | "geocode" | "system";

export interface EndpointParam {
    name: string;
    in: "path" | "query";
    type: "string" | "number";
    required?: boolean;
    description: Localized;
    example?: string;
    options?: string[];
}

export interface Endpoint {
    id: string;
    group: EndpointGroup;
    path: string;
    title: Localized;
    description: Localized;
    params?: EndpointParam[];
    tag?: Localized;
    geo?: boolean;
    /** Downloads etc. — show the request but no Send button. */
    noTry?: boolean;
}

export const GROUPS: { id: EndpointGroup; title: Localized; intro: Localized }[] = [
    {
        id: "admin",
        title: { en: "Administrative", km: "រដ្ឋបាល" },
        intro: {
            en: "The four-tier hierarchy as flat JSON records, without geometry. These are the endpoints for forms, address validation and lookups.",
            km: "ឋានានុក្រមបួនកម្រិតជាទិន្នន័យ JSON សាមញ្ញ ដោយគ្មានធរណីមាត្រ។ ទាំងនេះជា endpoint សម្រាប់ទម្រង់បំពេញ ការផ្ទៀងផ្ទាត់អាសយដ្ឋាន និងការស្វែងរក។",
        },
    },
    {
        id: "boundaries",
        title: { en: "Boundaries", km: "ព្រំប្រទល់" },
        intro: {
            en: "Polygons for provinces, districts and communes. List endpoints return GeoJSON by default. Add format=summary to get lightweight JSON with centroids and bounding boxes but no coordinates. Boundary endpoints take the zero-padded code (e.g. 070203), not the numeric id.",
            km: "ពហុកោណសម្រាប់ខេត្ត ស្រុក និងឃុំ។ endpoint បញ្ជីបញ្ជូន GeoJSON តាមលំនាំដើម។ បន្ថែម format=summary ដើម្បីទទួលបាន JSON ស្រាលដែលមានចំណុចកណ្តាល និងប្រអប់ព្រំដែន ប៉ុន្តែគ្មានកូអរដោនេ។ endpoint ព្រំប្រទល់ប្រើលេខកូដដែលមានសូន្យខាងមុខ (ឧ. 070203) មិនមែន id ជាលេខទេ។",
        },
    },
    {
        id: "geocode",
        title: { en: "Geocoding", km: "ការស្វែងរកអាសយដ្ឋាន" },
        intro: {
            en: "Address lookups backed by OpenStreetMap Nominatim, normalised into Cambodia's hierarchy and cached for a week. Limited to 30 requests per minute.",
            km: "ការស្វែងរកអាសយដ្ឋានដោយប្រើ OpenStreetMap Nominatim ដែលបានផ្គូផ្គងទៅនឹងឋានានុក្រមរដ្ឋបាលកម្ពុជា និងរក្សាក្នុង Cache មួយសប្តាហ៍។ កំណត់ត្រឹម ៣០ សំណើក្នុងមួយនាទី។",
        },
    },
    {
        id: "system",
        title: { en: "System", km: "ប្រព័ន្ធ" },
        intro: { en: "Service metadata and health.", km: "ព័ត៌មានសេវាកម្ម និងស្ថានភាពដំណើរការ។" },
    },
];

const LEVEL_OPTS = ["", "province", "district", "commune", "village"];
const FORMAT_OPTS = ["geojson", "summary"];
const PER_MIN_120: Localized = { en: "120/min", km: "១២០/នាទី" };
const PER_MIN_30: Localized = { en: "30/min", km: "៣០/នាទី" };

const format = (example = "summary"): EndpointParam => ({
    name: "format", in: "query", type: "string", example, options: FORMAT_OPTS,
    description: { en: "geojson (default) or summary.", km: "geojson (លំនាំដើម) ឬ summary។" },
});
const nameFilter = (): EndpointParam => ({
    name: "q", in: "query", type: "string", example: "",
    description: { en: "Name filter (Khmer or English).", km: "ចម្រោះតាមឈ្មោះ (ខ្មែរ ឬអង់គ្លេស)។" },
});
const limit = (example = ""): EndpointParam => ({
    name: "limit", in: "query", type: "number", example,
    description: { en: "Max features.", km: "ចំនួន Feature អតិបរមា។" },
});
const offset: EndpointParam = {
    name: "offset", in: "query", type: "number", example: "",
    description: { en: "Skip this many features.", km: "រំលង Feature ចំនួននេះ។" },
};
const provinceCode = (example: string, en = "Parent province code.", km = "លេខកូដខេត្តមេ។"): EndpointParam => ({
    name: "province_code", in: "query", type: "string", example, description: { en, km },
});
const districtCode = (example: string, en = "Parent district code.", km = "លេខកូដស្រុកមេ។"): EndpointParam => ({
    name: "district_code", in: "query", type: "string", example, description: { en, km },
});
const anyId = (example: string): EndpointParam => ({
    name: "id", in: "path", type: "number", required: true, example,
    description: { en: "Id at any level.", km: "id នៃកម្រិតណាមួយ។" },
});

export const ENDPOINTS: Endpoint[] = [
    // ----- Administrative -----
    {
        id: "admin-provinces", group: "admin", path: "/api/admin/provinces",
        title: { en: "List provinces", km: "បញ្ជីខេត្ត" },
        description: { en: "All 25 provinces and the capital, sorted by code.", km: "រាជធានី និងខេត្តទាំង ២៥ តម្រៀបតាមលេខកូដ។" },
    },
    {
        id: "admin-districts", group: "admin", path: "/api/admin/provinces/{id}/districts",
        title: { en: "List districts of a province", km: "បញ្ជីស្រុកក្នុងខេត្ត" },
        description: { en: "Districts, khans and krongs belonging to a province.", km: "ស្រុក ខណ្ឌ និងក្រុង ដែលស្ថិតក្នុងខេត្តមួយ។" },
        params: [{ name: "id", in: "path", type: "number", required: true, example: "12", description: { en: "Province id (e.g. 12 for Phnom Penh).", km: "id ខេត្ត (ឧ. 12 សម្រាប់រាជធានីភ្នំពេញ)។" } }],
    },
    {
        id: "admin-communes", group: "admin", path: "/api/admin/districts/{id}/communes",
        title: { en: "List communes of a district", km: "បញ្ជីឃុំក្នុងស្រុក" },
        description: { en: "Communes and sangkats belonging to a district.", km: "ឃុំ និងសង្កាត់ ដែលស្ថិតក្នុងស្រុកមួយ។" },
        params: [{ name: "id", in: "path", type: "number", required: true, example: "1201", description: { en: "District id.", km: "id ស្រុក។" } }],
    },
    {
        id: "admin-villages", group: "admin", path: "/api/admin/communes/{id}/villages",
        title: { en: "List villages of a commune", km: "បញ្ជីភូមិក្នុងឃុំ" },
        description: { en: "Villages (phum) belonging to a commune.", km: "ភូមិ ដែលស្ថិតក្នុងឃុំមួយ។" },
        params: [{ name: "id", in: "path", type: "number", required: true, example: "120101", description: { en: "Commune id.", km: "id ឃុំ។" } }],
    },
    {
        id: "admin-nested-communes", group: "admin", path: "/api/admin/provinces/{provinceId}/districts/{districtId}/communes",
        title: { en: "Nested communes by province & district", km: "បញ្ជីឃុំតាមខេត្តនិងស្រុក (Nesting)" },
        description: { en: "Strict RESTful hierarchical query validating that the district belongs to the province.", km: "ការទាញយកឃុំដោយផ្ទៀងផ្ទាត់ថាស្រុកនោះពិតជាស្ថិតក្នុងខេត្តដែលបានបញ្ជាក់។" },
        params: [
            { name: "provinceId", in: "path", type: "number", required: true, example: "12", description: { en: "Province id (e.g. 12).", km: "id ខេត្ត។" } },
            { name: "districtId", in: "path", type: "number", required: true, example: "1202", description: { en: "District id (e.g. 1202).", km: "id ស្រុក។" } },
        ],
    },
    {
        id: "admin-item", group: "admin", path: "/api/admin/item/{id}",
        title: { en: "Get a place", km: "ទាញយកទីតាំងមួយ" },
        description: { en: "A single record at any level, looked up by id.", km: "ទិន្នន័យមួយនៃកម្រិតណាក៏បាន ស្វែងរកតាម id។" },
        params: [anyId("1201")],
    },
    {
        id: "admin-hierarchy", group: "admin", path: "/api/admin/hierarchy/{id}",
        title: { en: "Resolve full path", km: "ស្វែងរកផ្លូវពេញ" },
        description: {
            en: "Returns the place and all its ancestors as an object keyed by level. Use it to render a full address from a single stored id.",
            km: "បញ្ជូនទីតាំង និងអង្គភាពមេទាំងអស់របស់វា ជា object ដែលមាន key តាមកម្រិត។ ប្រើវាដើម្បីបង្ហាញអាសយដ្ឋានពេញពី id តែមួយដែលបានរក្សាទុក។",
        },
        params: [anyId("12010101")],
    },
    {
        id: "admin-search", group: "admin", path: "/api/admin/search", tag: PER_MIN_120,
        title: { en: "Search places", km: "ស្វែងរកទីតាំង" },
        description: {
            en: "Matches Khmer or English names, ignoring case, spaces and accents. Exact and prefix matches rank first.",
            km: "ផ្គូផ្គងឈ្មោះខ្មែរ ឬអង់គ្លេស ដោយមិនខ្វល់ពីអក្សរធំតូច ដកឃ្លា ឬសញ្ញាសំឡេង។ លទ្ធផលដែលត្រូវគ្នាទាំងស្រុង ឬចាប់ផ្តើមដូចគ្នាត្រូវបានដាក់មុនគេ។",
        },
        params: [
            { name: "q", in: "query", type: "string", required: true, example: "siem reap", description: { en: "Search text, up to 50 characters.", km: "ពាក្យស្វែងរក មិនលើសពី ៥០ តួអក្សរ។" } },
            { name: "level", in: "query", type: "string", example: "", options: LEVEL_OPTS, description: { en: "Restrict to one level.", km: "កំណត់ត្រឹមកម្រិតតែមួយ។" } },
            { name: "limit", in: "query", type: "number", example: "5", description: { en: "Results to return, 1–100. Default 20.", km: "ចំនួនលទ្ធផល ១–១០០។ លំនាំដើម ២០។" } },
        ],
    },
    {
        id: "admin-stats", group: "admin", path: "/api/admin/stats",
        title: { en: "Dataset statistics", km: "ស្ថិតិសំណុំទិន្នន័យ" },
        description: { en: "Record counts per level and the last data sync time.", km: "ចំនួនទិន្នន័យតាមកម្រិតនីមួយៗ និងពេលធ្វើសមកាលកម្មចុងក្រោយ។" },
    },

    // ----- Boundaries -----
    {
        id: "b-list", group: "boundaries", path: "/api/boundaries", geo: true,
        title: { en: "Query boundaries", km: "ស្វែងរកព្រំប្រទល់" },
        description: {
            en: "Filter boundaries at any level. Without level it returns provinces. Supports pagination with limit and offset.",
            km: "ចម្រោះព្រំប្រទល់នៅកម្រិតណាមួយ។ បើគ្មាន level វាបញ្ជូនខេត្ត។ គាំទ្រការបែងចែកទំព័រដោយ limit និង offset។",
        },
        params: [
            { name: "level", in: "query", type: "string", example: "district", options: ["province", "district", "commune"], description: { en: "province, district or commune. Defaults to province.", km: "province, district ឬ commune។ លំនាំដើម province។" } },
            provinceCode("12", "Only children of this province.", "តែអង្គភាពរងនៃខេត្តនេះ។"),
            districtCode("", "Only children of this district.", "តែអង្គភាពរងនៃស្រុកនេះ។"),
            nameFilter(), format(), limit("3"), offset,
        ],
    },
    {
        id: "b-provinces", group: "boundaries", path: "/api/boundaries/provinces", geo: true,
        title: { en: "Province boundaries", km: "ព្រំប្រទល់ខេត្ត" },
        description: {
            en: "All 25 province polygons (about 1 MB as GeoJSON). Use format=summary for centroids and bounding boxes only.",
            km: "ពហុកោណខេត្តទាំង ២៥ (ប្រហែល 1 MB ជា GeoJSON)។ ប្រើ format=summary សម្រាប់តែចំណុចកណ្តាល និងប្រអប់ព្រំដែន។",
        },
        params: [format(), nameFilter()],
    },
    {
        id: "b-province", group: "boundaries", path: "/api/boundaries/provinces/{code}", geo: true,
        title: { en: "One province boundary", km: "ព្រំប្រទល់ខេត្តមួយ" },
        description: { en: "A single province Feature.", km: "Feature នៃខេត្តមួយ។" },
        params: [{ name: "code", in: "path", type: "string", required: true, example: "12", description: { en: "Province code.", km: "លេខកូដខេត្ត។" } }, format()],
    },
    {
        id: "b-districts", group: "boundaries", path: "/api/boundaries/districts", geo: true,
        title: { en: "District boundaries", km: "ព្រំប្រទល់ស្រុក" },
        description: { en: "District polygons, usually filtered by province.", km: "ពហុកោណស្រុក ជាធម្មតាចម្រោះតាមខេត្ត។" },
        params: [provinceCode("12"), nameFilter(), format(), limit(), offset],
    },
    {
        id: "b-district", group: "boundaries", path: "/api/boundaries/districts/{code}", geo: true,
        title: { en: "One district boundary", km: "ព្រំប្រទល់ស្រុកមួយ" },
        description: { en: "A single district Feature.", km: "Feature នៃស្រុកមួយ។" },
        params: [{ name: "code", in: "path", type: "string", required: true, example: "1201", description: { en: "District code.", km: "លេខកូដស្រុក។" } }, format()],
    },
    {
        id: "b-communes", group: "boundaries", path: "/api/boundaries/communes", geo: true,
        title: { en: "Commune boundaries", km: "ព្រំប្រទល់ឃុំ" },
        description: { en: "Commune polygons, filtered by district or province.", km: "ពហុកោណឃុំ ចម្រោះតាមស្រុក ឬខេត្ត។" },
        params: [districtCode("1201"), provinceCode(""), nameFilter(), format(), limit(), offset],
    },
    {
        id: "b-commune", group: "boundaries", path: "/api/boundaries/communes/{code}", geo: true,
        title: { en: "One commune boundary", km: "ព្រំប្រទល់ឃុំមួយ" },
        description: { en: "A single commune Feature.", km: "Feature នៃឃុំមួយ។" },
        params: [{ name: "code", in: "path", type: "string", required: true, example: "120101", description: { en: "Commune code (zero-padded).", km: "លេខកូដឃុំ (មានសូន្យខាងមុខ)។" } }, format()],
    },
    {
        id: "b-item", group: "boundaries", path: "/api/boundaries/item/{code}", geo: true,
        title: { en: "Boundary by any code", km: "ព្រំប្រទល់តាមលេខកូដណាមួយ" },
        description: {
            en: "Detects the level from the code length. Handy when you don't know the level in advance.",
            km: "កំណត់កម្រិតដោយស្វ័យប្រវត្តិពីប្រវែងលេខកូដ។ មានប្រយោជន៍ពេលអ្នកមិនដឹងកម្រិតជាមុន។",
        },
        params: [{ name: "code", in: "path", type: "string", required: true, example: "1201", description: { en: "Any province, district or commune code.", km: "លេខកូដខេត្ត ស្រុក ឬឃុំណាមួយ។" } }, format()],
    },
    {
        id: "b-zone", group: "boundaries", path: "/api/boundaries/zone", geo: true,
        title: { en: "Boundary zone by coordinates", km: "ព្រំប្រទល់តំបន់តាមកូអរដោនេ" },
        description: {
            en: "Sub-millisecond point-in-polygon lookup resolving the province, district, and commune boundary zone containing a GPS coordinate.",
            km: "ការស្វែងរកចំណុចក្នុងពហុកោណកម្រិតអនុមិល្លីវិនាទី ដើម្បីកំណត់ព្រំប្រទល់ខេត្ត ស្រុក និងឃុំ ដែលផ្ទុកកូអរដោនេ GPS។",
        },
        params: [
            { name: "lat", in: "query", type: "number", required: true, example: "11.57608", description: { en: "Latitude (-90 to 90)", km: "រយៈទទឹង (-90 ដល់ 90)" } },
            { name: "lng", in: "query", type: "number", required: true, example: "104.92305", description: { en: "Longitude (-180 to 180, 'lon' also accepted)", km: "រយៈបណ្តោយ (-180 ដល់ 180, អាចប្រើ 'lon' បាន)" } },
            {
                name: "level", in: "query", type: "string", example: "all",
                options: ["all", "province", "district", "commune"],
                description: { en: "Hierarchy level to return ('all' for complete 3-tier hierarchy).", km: "កម្រិតឋានានុក្រមដែលត្រូវបង្ហាញ ('all' សម្រាប់ឋានានុក្រម 3 កម្រិតពេញលេញ)។" },
            },
            format(),
        ],
    },
    {
        id: "b-zones", group: "boundaries", path: "/api/boundaries/zones", geo: true,
        title: { en: "Boundary zones by multiple coordinates", km: "ព្រំប្រទល់តំបន់តាមកូអរដោនេច្រើន" },
        description: {
            en: "Batch point-in-polygon: resolve the province, district and commune for up to 100 coordinates in one request. Summary results come back in input order; geojson returns each distinct boundary once, with the indexes of the points it contains in properties.point_indexes.",
            km: "ការស្វែងរកចំណុចក្នុងពហុកោណជាបាច់៖ កំណត់ខេត្ត ស្រុក និងឃុំ សម្រាប់កូអរដោនេរហូតដល់ 100 ក្នុងសំណើតែមួយ។ លទ្ធផល summary តាមលំដាប់ដែលបានផ្ញើ; geojson បង្ហាញព្រំប្រទល់នីមួយៗតែម្តង ជាមួយលេខរៀងចំណុចនៅក្នុង properties.point_indexes។",
        },
        params: [
            {
                name: "points", in: "query", type: "string", required: true,
                example: "11.57608,104.92305;13.4125,103.8670;10.6104,104.1814",
                description: { en: "lat,lng pairs separated by ';' or '|' (max 100).", km: "គូ lat,lng បំបែកដោយ ';' ឬ '|' (អតិបរមា 100)។" },
            },
            {
                name: "level", in: "query", type: "string", example: "all",
                options: ["all", "province", "district", "commune"],
                description: { en: "Hierarchy level to return ('all' for complete 3-tier hierarchy).", km: "កម្រិតឋានានុក្រមដែលត្រូវបង្ហាញ ('all' សម្រាប់ឋានានុក្រម 3 កម្រិតពេញលេញ)។" },
            },
            {
                name: "format", in: "query", type: "string", example: "summary", options: ["summary", "geojson"],
                description: { en: "summary (default, per point) or geojson (distinct boundaries).", km: "summary (លំនាំដើម តាមចំណុច) ឬ geojson (ព្រំប្រទល់ផ្សេងៗគ្នា)។" },
            },
        ],
    },
    {
        id: "b-zones-count", group: "boundaries", path: "/api/boundaries/zones/count",
        title: { en: "Count points per boundary", km: "រាប់ចំណុចតាមព្រំប្រទល់" },
        description: {
            en: "Counts how many coordinates (e.g. customer locations) fall in each commune, district or province. GET takes up to 100 points in 'at'; POST takes up to 10,000 as JSON: { \"latlngs\": [{ \"lat\": 11.57, \"lng\": 104.92 }] }. Points outside Cambodia are grouped into a final matched: false item.",
            km: "រាប់ចំនួនកូអរដោនេ (ឧ. ទីតាំងអតិថិជន) ក្នុងឃុំ ស្រុក ឬខេត្តនីមួយៗ។ GET ទទួលរហូតដល់ 100 ចំណុចក្នុង 'at'; POST ទទួលរហូតដល់ 10,000 ជា JSON: { \"latlngs\": [{ \"lat\": 11.57, \"lng\": 104.92 }] }។ ចំណុចនៅក្រៅកម្ពុជាត្រូវបានដាក់ជាក្រុម matched: false ចុងក្រោយ។",
        },
        params: [
            {
                name: "at", in: "query", type: "string", required: true,
                example: "11.57608,104.92305;11.5761,104.9231;13.4125,103.8670",
                description: { en: "lat,lng pairs separated by ';' or '|' (max 100). Use POST for more.", km: "គូ lat,lng បំបែកដោយ ';' ឬ '|' (អតិបរមា 100)។ ប្រើ POST សម្រាប់ច្រើនជាងនេះ។" },
            },
            {
                name: "level", in: "query", type: "string", example: "commune",
                options: ["commune", "district", "province"],
                description: { en: "Boundary level to count by (default commune).", km: "កម្រិតព្រំប្រទល់សម្រាប់រាប់ (លំនាំដើម ឃុំ)។" },
            },
            {
                name: "sort", in: "query", type: "string", example: "input", options: ["input", "count"],
                description: { en: "input (first-seen order, default) or count (largest first).", km: "input (តាមលំដាប់ដែលឃើញមុន លំនាំដើម) ឬ count (ច្រើនបំផុតមុន)។" },
            },
        ],
    },
    {
        id: "b-hierarchy", group: "boundaries", path: "/api/boundaries/hierarchy/{code}", geo: true,
        title: { en: "Boundary with ancestors", km: "ព្រំប្រទល់ជាមួយអង្គភាពមេ" },
        description: {
            en: "The Feature for a code plus its parent district and province Features, keyed by level.",
            km: "Feature នៃលេខកូដមួយ រួមជាមួយ Feature ស្រុក និងខេត្តមេរបស់វា ដែលមាន key តាមកម្រិត។",
        },
        params: [{ name: "code", in: "path", type: "string", required: true, example: "120101", description: { en: "Commune or district code.", km: "លេខកូដឃុំ ឬស្រុក។" } }],
    },
    {
        id: "b-stats", group: "boundaries", path: "/api/boundaries/stats",
        title: { en: "Boundary statistics", km: "ស្ថិតិព្រំប្រទល់" },
        description: { en: "Polygon counts per level, the national bounding box and the data source.", km: "ចំនួនពហុកោណតាមកម្រិត ប្រអប់ព្រំដែនថ្នាក់ជាតិ និងប្រភពទិន្នន័យ។" },
    },
    {
        id: "b-raw", group: "boundaries", path: "/api/boundaries/raw/{filename}", noTry: true,
        title: { en: "Download raw GeoJSON", km: "ទាញយក GeoJSON ដើម" },
        description: { en: "The full source file as an attachment.", km: "ឯកសារប្រភពពេញលេញជាឯកសារភ្ជាប់។" },
        params: [{
            name: "filename", in: "path", type: "string", required: true, example: "provinces.geojson",
            options: ["provinces.geojson", "districts.geojson", "communes.geojson"],
            description: { en: "provinces.geojson, districts.geojson or communes.geojson.", km: "provinces.geojson, districts.geojson ឬ communes.geojson។" },
        }],
    },

    // ----- Geocoding -----
    {
        id: "geo-reverse", group: "geocode", path: "/api/geocode/reverse", tag: PER_MIN_30,
        title: { en: "Reverse geocode", km: "ស្វែងរកអាសយដ្ឋានពីកូអរដោនេ" },
        description: { en: "Turn coordinates into an address mapped to Cambodia's hierarchy.", km: "បម្លែងកូអរដោនេទៅជាអាសយដ្ឋាន ដែលផ្គូផ្គងនឹងឋានានុក្រមរដ្ឋបាលកម្ពុជា។" },
        params: [
            { name: "lat", in: "query", type: "number", required: true, example: "11.5564", description: { en: "Latitude, decimal degrees.", km: "រយៈទទឹង ជាដឺក្រេទសភាគ។" } },
            { name: "lon", in: "query", type: "number", required: true, example: "104.9282", description: { en: "Longitude, decimal degrees.", km: "រយៈបណ្តោយ ជាដឺក្រេទសភាគ។" } },
        ],
    },
    {
        id: "geo-search", group: "geocode", path: "/api/geocode/search", tag: PER_MIN_30,
        title: { en: "Forward geocode", km: "ស្វែងរកទីតាំងតាមឈ្មោះ" },
        description: { en: "Find addresses, landmarks and points of interest in Cambodia by name.", km: "ស្វែងរកអាសយដ្ឋាន ទីសម្គាល់ និងទីកន្លែងគួរឱ្យចាប់អារម្មណ៍នៅកម្ពុជា តាមឈ្មោះ។" },
        params: [
            { name: "q", in: "query", type: "string", required: true, example: "Angkor Wat", description: { en: "Search text, up to 100 characters.", km: "ពាក្យស្វែងរក មិនលើសពី ១០០ តួអក្សរ។" } },
            { name: "limit", in: "query", type: "number", example: "3", description: { en: "Results to return, 1–50. Default 10.", km: "ចំនួនលទ្ធផល ១–៥០។ លំនាំដើម ១០។" } },
        ],
    },

    // ----- System -----
    {
        id: "sys-health", group: "system", path: "/health",
        title: { en: "Health check", km: "ពិនិត្យស្ថានភាព" },
        description: { en: "Liveness probe with uptime.", km: "ពិនិត្យថាសេវាកម្មកំពុងដំណើរការ រួមទាំងរយៈពេលដំណើរការ។" },
    },
    {
        id: "sys-info", group: "system", path: "/api/info",
        title: { en: "API index", km: "បញ្ជី API" },
        description: { en: "Machine-readable list of every endpoint and the level conventions.", km: "បញ្ជី endpoint ទាំងអស់ និងគោលការណ៍កម្រិត ដែលម៉ាស៊ីនអាចអានបាន។" },
    },
];

/** Build the request path from current parameter values. Returns null while a path param is empty. */
export function buildPath(ep: Endpoint, values: Record<string, string>): string | null {
    let path = ep.path;
    const qs: string[] = [];
    let missing = false;
    for (const p of ep.params ?? []) {
        const v = (values[p.name] ?? "").trim();
        if (p.in === "path") {
            if (!v) missing = true;
            path = path.replace(`{${p.name}}`, v ? encodeURIComponent(v) : `{${p.name}}`);
        } else if (v) qs.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`);
    }
    const full = path + (qs.length ? `?${qs.join("&")}` : "");
    return missing ? null : full;
}

export function displayPath(ep: Endpoint, values: Record<string, string>): string {
    return buildPath(ep, values) ?? ep.path;
}
