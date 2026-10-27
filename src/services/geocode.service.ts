import { NominatimClient } from "./nominatim.client.js";
import { AdminStore } from "../data/store.js";
import type {
    AdminHierarchy,
    GeocodeResult,
    NominatimRawItem,
} from "../types/geocode.js";

export class GeocodeService {
    private nominatim: NominatimClient;
    private store: AdminStore;

    constructor() {
        this.nominatim = new NominatimClient();
        this.store = AdminStore.getInstance();
    }

    /**
     * Reverse geocode GPS coordinate to standardized 4-tier Cambodian hierarchy
     */
    public async reverse(
        lat: number,
        lon: number,
    ): Promise<GeocodeResult | null> {
        const raw = await this.nominatim.reverse(lat, lon);
        if (!raw) {
            return null;
        }

        return this.normalizeNominatimItem(raw);
    }

    /**
     * Search Cambodia addresses and normalize into standardized hierarchy
     */
    public async search(query: string, limit = 10): Promise<GeocodeResult[]> {
        const rawList = await this.nominatim.search(query, limit);
        return rawList.map((item) => this.normalizeNominatimItem(item));
    }

    /**
     * Cascading key normalization adhering to Section 6.1 nuances & canonical local matching
     */
    public normalizeNominatimItem(item: NominatimRawItem): GeocodeResult {
        const addr = item.address || {};

        // 1. Resolve Province (Level 1)
        // Phnom Penh is often listed under 'city' or 'state'
        let province: string | null = addr.state ||
            addr.province ||
            addr.state_district ||
            null;

        if (
            !province &&
            (addr.city === "Phnom Penh" || addr.city === "រាជធានីភ្នំពេញ")
        ) {
            province = "Phnom Penh";
        }

        // 2. Resolve District / Khan / Krong (Level 2)
        let district: string | null = addr.county ||
            addr.district ||
            addr.city_district ||
            null;

        // Special case: In provinces, the provincial town might be listed as 'city' or 'town'
        if (!district && addr.city && addr.city !== province) {
            district = addr.city;
        }
        if (!district && addr.town && addr.town !== province) {
            district = addr.town;
        }

        // 3. Resolve Commune / Sangkat (Level 3)
        // Communes show up as suburb, quarter, municipality, or town
        let commune: string | null = addr.suburb ||
            addr.quarter ||
            addr.municipality ||
            addr.neighbourhood ||
            null;

        // 4. Resolve Village / Phum (Level 4)
        // Villages show up as village, hamlet, or neighbourhood
        let village: string | null = addr.village ||
            addr.hamlet ||
            null;

        // Disambiguation if village and commune overlap
        if (village && !commune && addr.village) {
            // If rural commune was mapped to village
            commune = addr.village;
            village = null;
        }

        // Canonicalize province name using local store index if matched
        if (province) {
            const matchedProvince =
                this.store.search(province, "province", 1)[0];
            if (matchedProvince) {
                province = matchedProvince.name_en;
            }
        }

        const hierarchy: AdminHierarchy = {
            province,
            district,
            commune,
            village,
            country: "Cambodia",
        };

        return {
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            hierarchy,
            osmId: item.osm_id,
            osmType: item.osm_type,
            type: item.type,
            importance: item.importance,
            rawAddress: addr,
        };
    }
}
