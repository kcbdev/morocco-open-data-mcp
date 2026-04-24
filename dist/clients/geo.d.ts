/**
 * Morocco Open Data MCP - Geography/GIS Client
 * Client for Morocco geographic and administrative boundary data
 */
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
export interface GeoConfig {
    baseUrl?: string;
    timeout?: number;
    cache?: Cache;
    rateLimiter?: RateLimiter;
}
export interface GeoJSON {
    type: "FeatureCollection" | "Feature" | "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";
    features?: GeoJSONFeature[];
    geometry?: GeoJSONGeometry;
    properties?: Record<string, unknown>;
    bbox?: number[];
    crs?: {
        type: string;
        properties: {
            name: string;
        };
    };
}
export interface GeoJSONFeature {
    type: "Feature";
    id?: string | number;
    geometry: GeoJSONGeometry;
    properties: Record<string, unknown>;
}
export interface GeoJSONGeometry {
    type: "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";
    coordinates: number[] | number[][] | number[][][] | number[][][][];
}
export interface AdminLevel {
    level: number;
    name: string;
    nameAr: string;
    nameFr: string;
    description: string;
}
export interface AdminDivision {
    id: string;
    code: string;
    name: string;
    nameAr: string;
    nameFr: string;
    type: string;
    level: number;
    parentCode?: string;
    parentName?: string;
    geometry?: GeoJSONGeometry;
    bbox?: number[];
    centroid?: [number, number];
    area?: number;
    population?: number;
    metadata?: Record<string, unknown>;
}
export interface City {
    id: string;
    name: string;
    nameAr: string;
    nameFr: string;
    regionCode: string;
    regionName: string;
    provinceCode: string;
    provinceName: string;
    coordinates: [number, number];
    elevation?: number;
    population?: number;
    timezone: string;
}
export interface Region {
    code: string;
    name: string;
    nameAr: string;
    nameFr: string;
    capital: string;
    area: number;
    population?: number;
    provinces: string[];
    bbox?: number[];
    geometry?: GeoJSONGeometry;
}
export interface Province {
    code: string;
    name: string;
    nameAr: string;
    nameFr: string;
    regionCode: string;
    regionName: string;
    capital: string;
    area: number;
    population?: number;
    communes: string[];
    bbox?: number[];
    geometry?: GeoJSONGeometry;
}
export interface Commune {
    code: string;
    name: string;
    nameAr: string;
    nameFr: string;
    type: "urbaine" | "rurale";
    provinceCode: string;
    provinceName: string;
    regionCode: string;
    regionName: string;
    population?: number;
    bbox?: number[];
    geometry?: GeoJSONGeometry;
}
export interface Location {
    name: string;
    nameAr: string;
    type: string;
    coordinates: [number, number];
    elevation?: number;
    region?: string;
    province?: string;
}
export interface Coordinate {
    latitude: number;
    longitude: number;
    accuracy?: number;
    source?: string;
}
export interface DistanceCalculation {
    from: Coordinate;
    to: Coordinate;
    distance: number;
    unit: "km" | "m" | "miles";
    bearing?: number;
}
export interface BoundingBox {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
}
export declare class GeoClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    private readonly moroccoBBox;
    private readonly adminLevels;
    private readonly regions;
    private readonly cities;
    constructor(config?: GeoConfig);
    private handleError;
    private request;
    /**
     * Get all administrative levels
     */
    getAdminLevels(): AdminLevel[];
    /**
     * Get all regions of Morocco
     */
    getAllRegions(): Region[];
    /**
     * Get a specific region by code
     */
    getRegion(code: string): Region | undefined;
    /**
     * Get region by name (supports French, Arabic, English)
     */
    getRegionByName(name: string): Region | undefined;
    /**
     * Get all cities
     */
    getAllCities(): City[];
    /**
     * Get city by ID
     */
    getCity(id: string): City | undefined;
    /**
     * Get city by name
     */
    getCityByName(name: string): City | undefined;
    /**
     * Get cities in a region
     */
    getCitiesByRegion(regionCode: string): City[];
    /**
     * Get nearest cities to coordinates
     */
    getNearestCities(latitude: number, longitude: number, limit?: number): Array<City & {
        distance: number;
    }>;
    /**
     * Get coordinates for a city
     */
    getCityCoordinates(cityId: string): [number, number] | undefined;
    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(from: Coordinate, to: Coordinate, unit?: "km" | "m" | "miles"): number;
    /**
     * Calculate bearing between two points
     */
    calculateBearing(from: Coordinate, to: Coordinate): number;
    /**
     * Get distance and bearing between two points
     */
    calculateDistanceAndBearing(from: Coordinate, to: Coordinate, unit?: "km" | "m" | "miles"): DistanceCalculation;
    /**
     * Get bounding box for Morocco
     */
    getMoroccoBoundingBox(): BoundingBox;
    /**
     * Check if coordinates are within Morocco
     */
    isWithinMorocco(latitude: number, longitude: number): boolean;
    /**
     * Create a GeoJSON Point feature
     */
    createPointFeature(longitude: number, latitude: number, properties?: Record<string, unknown>): GeoJSONFeature;
    /**
     * Create a GeoJSON FeatureCollection
     */
    createFeatureCollection(features: GeoJSONFeature[], properties?: Record<string, unknown>): GeoJSON;
    /**
     * Calculate bounding box from features
     */
    calculateBoundingBox(features: GeoJSONFeature[]): number[] | undefined;
    /**
     * Extract all coordinates from a geometry
     */
    private extractCoordinates;
    /**
     * Create region GeoJSON features
     */
    getRegionsGeoJSON(): Promise<GeoJSON>;
    /**
     * Create cities GeoJSON features
     */
    getCitiesGeoJSON(): Promise<GeoJSON>;
    /**
     * Get administrative hierarchy for a location
     */
    getAdminHierarchy(regionCode: string, provinceCode?: string, communeCode?: string): {
        region?: Region;
        province?: Province;
        commune?: Commune;
    };
    /**
     * Search for locations by name
     */
    searchLocations(query: string): Array<City | Region>;
    /**
     * Convert degrees to radians
     */
    private toRadians;
    /**
     * Convert radians to degrees
     */
    private toDegrees;
    /**
     * Get coordinates in different formats
     */
    formatCoordinates(latitude: number, longitude: number, format?: "decimal" | "dms" | "utm"): string;
    /**
     * Convert decimal degrees to DMS (Degrees, Minutes, Seconds)
     */
    private toDMS;
    /**
     * Get the centroid of a bounding box
     */
    getCentroid(bbox: BoundingBox): [number, number];
    /**
     * Check if API is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get GeoJSON for a specific region
     */
    getRegionGeoJSON(regionCode: string): Promise<GeoJSONFeature | null>;
    /**
     * Get all locations as GeoJSON
     */
    getAllLocationsGeoJSON(): Promise<GeoJSON>;
}
export declare const defaultGeoClient: GeoClient;
//# sourceMappingURL=geo.d.ts.map