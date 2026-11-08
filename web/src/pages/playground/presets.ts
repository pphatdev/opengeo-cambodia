export interface PlaygroundPreset {
    id: string;
    label: { en: string; km: string };
    endpointId: string;
    path: string;
    params: Record<string, string>;
    description: { en: string; km: string };
}

export const PRESETS: PlaygroundPreset[] = [
    {
        id: "all-provinces",
        label: { en: "All 25 Provinces", km: "ខេត្តទាំង ២៥" },
        endpointId: "admin-provinces",
        path: "/api/admin/provinces",
        params: {},
        description: { en: "Retrieve list of all 25 provinces and the capital", km: "ទាញយកបញ្ជីរាជធានី-ខេត្តទាំង ២៥" },
    },
    {
        id: "pp-districts",
        label: { en: "Phnom Penh Districts", km: "ខណ្ឌក្នុងភ្នំពេញ" },
        endpointId: "admin-districts",
        path: "/api/admin/provinces/12/districts",
        params: { id: "12" },
        description: { en: "All 14 khans / districts in Phnom Penh (ID: 12)", km: "ខណ្ឌទាំង ១៤ ក្នុងរាជធានីភ្នំពេញ (ID: 12)" },
    },
    {
        id: "full-hierarchy",
        label: { en: "Hierarchy Resolution", km: "ឋានានុក្រមពេញលេញ" },
        endpointId: "admin-hierarchy",
        path: "/api/admin/hierarchy/12010101",
        params: { id: "12010101" },
        description: { en: "Resolve full Province > District > Commune > Village path", km: "ស្វែងរកផ្លូវពីខេត្តដល់ភូមិពេញលេញ" },
    },
    {
        id: "search-places",
        label: { en: "Search \"Siem Reap\"", km: "ស្វែងរក \"សៀមរាប\"" },
        endpointId: "admin-search",
        path: "/api/admin/search?q=siem reap&limit=5",
        params: { q: "siem reap", limit: "5" },
        description: { en: "Fuzzy search places in Khmer or English", km: "ស្វែងរកទីតាំងជាភាសាខ្មែរ ឬអង់គ្លេស" },
    },
    {
        id: "province-boundaries",
        label: { en: "Province Boundaries", km: "ព្រំប្រទល់ខេត្ត (GeoJSON)" },
        endpointId: "b-provinces",
        path: "/api/boundaries/provinces",
        params: { format: "geojson" },
        description: { en: "GeoJSON boundary polygons of all provinces", km: "ពហុកោណព្រំប្រទល់ GeoJSON នៃខេត្តទាំងអស់" },
    },
    {
        id: "pip-zone",
        label: { en: "Point-in-Polygon (Wat Phnom)", km: "កំណត់តំបន់តាម GPS (វត្តភ្នំ)" },
        endpointId: "b-zone",
        path: "/api/boundaries/zone?lat=11.57608&lng=104.92305&level=all",
        params: { lat: "11.57608", lng: "104.92305", level: "all" },
        description: { en: "Sub-millisecond GPS point-in-polygon lookup", km: "ស្វែងរកតំបន់រដ្ឋបាលពីកូអរដោនេ GPS ភ្លាមៗ" },
    },
    {
        id: "geocode-angkor",
        label: { en: "Geocode \"Angkor Wat\"", km: "ស្វែងរក \"អង្គរវត្ត\"" },
        endpointId: "geo-search",
        path: "/api/geocode/search?q=Angkor Wat&limit=3",
        params: { q: "Angkor Wat", limit: "3" },
        description: { en: "Forward geocoding mapped to Cambodia tiers", km: "ស្វែងរកទីតាំងតាមឈ្មោះជាមួយកូអរដោនេ" },
    },
    {
        id: "reverse-geocode",
        label: { en: "Reverse Geocode (Phnom Penh)", km: "ស្វែងរកអាសយដ្ឋានពីកូអរដោនេ" },
        endpointId: "geo-reverse",
        path: "/api/geocode/reverse?lat=11.5564&lon=104.9282",
        params: { lat: "11.5564", lon: "104.9282" },
        description: { en: "Reverse geocode GPS coordinates to administrative hierarchy", km: "បម្លែងកូអរដោនេទៅជាអាសយដ្ឋានរដ្ឋបាល" },
    },
    {
        id: "admin-stats",
        label: { en: "Dataset Statistics", km: "ស្ថិតិទិន្នន័យជាតិ" },
        endpointId: "admin-stats",
        path: "/api/admin/stats",
        params: {},
        description: { en: "Total counts of provinces, districts, communes, and villages", km: "ចំនួនសរុបនៃខេត្ត ស្រុក ឃុំ និងភូមិទូទាំងប្រទេស" },
    },
    {
        id: "health-check",
        label: { en: "Health Check", km: "ស្ថានភាពប្រព័ន្ធ" },
        endpointId: "sys-health",
        path: "/health",
        params: {},
        description: { en: "API status, version and uptime", km: "ស្ថានភាព ជំនាន់ និងរយៈពេលដំណើរការ" },
    },
];
