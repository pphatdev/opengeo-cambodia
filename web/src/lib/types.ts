// Shared with the API server so the UI stays in sync with the response shapes.
export type { AdminItem, AdminLevel, AdminStats, HierarchyPath } from "../../../src/types/admin";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export const LEVELS = ["province", "district", "commune", "village"] as const;
export type Level = (typeof LEVELS)[number];
export type BoundaryLevel = Exclude<Level, "village">;

export interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    meta?: { total?: number; tookMs?: number; timestamp?: string; source?: string };
    error?: string;
}

export interface BoundaryProps {
    id: number;
    code: string;
    pcode?: string;
    name: string;
    name_en: string;
    name_km: string;
    type_km?: string;
    level: BoundaryLevel;
    lat?: number;
    lon?: number;
    bbox?: [number, number, number, number];
    [key: string]: unknown;
}

export type BoundaryFeature = Feature<Geometry, BoundaryProps>;
export type BoundaryCollection = FeatureCollection<Geometry, BoundaryProps>;

export interface GeocodeResult {
    displayName: string;
    lat: number;
    lon: number;
    hierarchy: { province: string | null; district: string | null; commune: string | null; village: string | null; country: string };
    osmId?: number;
    osmType?: string;
    type?: string;
}

export const LEVEL_KM: Record<Level, string> = {
    province: "ខេត្ត",
    district: "ស្រុក / ខណ្ឌ",
    commune: "ឃុំ / សង្កាត់",
    village: "ភូមិ",
};
