import axios, { AxiosInstance } from "axios";
import { config } from "../config.js";
import { validateOutboundUrl } from "../security/supply-chain.js";
import type { NominatimRawItem } from "../types/geocode.js";

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export class NominatimClient {
    private client: AxiosInstance;
    private cache = new Map<string, CacheEntry<any>>();
    private maxCacheSize = 10000;
    private cacheTtlMs = 365 * 24 * 3600 * 1000; // 1 year (longest possible)

    constructor() {
        if (!validateOutboundUrl(config.nominatim.baseUrl)) {
            throw new Error(
                `[SupplyChainDefense] Blocked unauthorized Nominatim baseUrl: ${config.nominatim.baseUrl}`,
            );
        }

        this.client = axios.create({
            baseURL: config.nominatim.baseUrl,
            timeout: config.nominatim.timeoutMs,
            headers: {
                "User-Agent": config.nominatim.userAgent,
                "Accept": "application/json",
                "Accept-Language": "km,en;q=0.8",
            },
        });
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    private setCache<T>(key: string, data: T): void {
        if (this.cache.size >= this.maxCacheSize) {
            // FIFO eviction
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + this.cacheTtlMs,
        });
    }

    /**
     * Reverse geocode GPS latitude and longitude with caching
     */
    public async reverse(
        lat: number,
        lon: number,
    ): Promise<NominatimRawItem | null> {
        const cacheKey = `rev:${lat.toFixed(5)}:${lon.toFixed(5)}`;
        const cached = this.getFromCache<NominatimRawItem>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.client.get<NominatimRawItem>(
                "/reverse",
                {
                    params: {
                        lat,
                        lon,
                        format: "jsonv2",
                        addressdetails: 1,
                        zoom: 18,
                        "accept-language": "km,en",
                    },
                },
            );
            if (response.data) {
                this.setCache(cacheKey, response.data);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(
                    "[NominatimClient] Reverse geocode error:",
                    error.response?.status,
                    error.message,
                );
            } else {
                console.error("[NominatimClient] Unknown error:", error);
            }
            return null;
        }
    }

    /**
     * Free-text address search bounded to Cambodia with caching
     */
    public async search(
        query: string,
        limit = 10,
    ): Promise<NominatimRawItem[]> {
        const sanitizedQuery = query.trim().slice(0, 100);
        const clampedLimit = Math.max(1, Math.min(50, limit));
        const cacheKey =
            `search:${sanitizedQuery.toLowerCase()}:${clampedLimit}`;

        const cached = this.getFromCache<NominatimRawItem[]>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.client.get<NominatimRawItem[]>(
                "/search",
                {
                    params: {
                        q: sanitizedQuery,
                        format: "jsonv2",
                        addressdetails: 1,
                        countrycodes: "kh",
                        limit: clampedLimit,
                        "accept-language": "km,en",
                    },
                },
            );
            const data = Array.isArray(response.data) ? response.data : [];
            if (data.length > 0) {
                this.setCache(cacheKey, data);
            }
            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(
                    "[NominatimClient] Search geocode error:",
                    error.response?.status,
                    error.message,
                );
            } else {
                console.error("[NominatimClient] Unknown error:", error);
            }
            return [];
        }
    }
}
