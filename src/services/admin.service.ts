import { AdminStore } from "../data/store.js";
import type {
    AdminItem,
    AdminLevel,
    AdminStats,
    HierarchyPath,
} from "../types/admin.js";

export class AdminService {
    private store: AdminStore;

    constructor() {
        this.store = AdminStore.getInstance();
    }

    public getProvinces(): AdminItem[] {
        return this.store.getProvinces();
    }

    public getDistricts(provinceId: number): AdminItem[] {
        return this.store.getDistrictsByProvinceId(provinceId);
    }

    public getCommunes(districtId: number): AdminItem[] {
        return this.store.getCommunesByDistrictId(districtId);
    }

    public getVillages(communeId: number): AdminItem[] {
        return this.store.getVillagesByCommuneId(communeId);
    }

    public getItemById(id: number): AdminItem | undefined {
        return this.store.getItemById(id);
    }

    public getItemByCode(code: string): AdminItem | undefined {
        return this.store.getItemByCode(code);
    }

    public getHierarchy(id: number): HierarchyPath {
        return this.store.resolveHierarchy(id);
    }

    public search(query: string, level?: AdminLevel, limit = 20): AdminItem[] {
        return this.store.search(query, level, limit);
    }

    public getStats(): AdminStats {
        return this.store.getStats();
    }

    public getLastSyncAt(): string {
        return this.store.getLastSyncAt();
    }
}
