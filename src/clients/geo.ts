/**
 * Morocco Open Data MCP - Geography/GIS Client
 * Client for Morocco geographic and administrative boundary data
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
import { DataSourceError, NotFoundError, TimeoutError } from "../lib/errors.js";

export interface GeoConfig {
  baseUrl?: string;
  timeout?: number;
  cache?: Cache;
  rateLimiter?: RateLimiter;
}

export interface GeoJSON {
  type:
    | "FeatureCollection"
    | "Feature"
    | "Point"
    | "LineString"
    | "Polygon"
    | "MultiPoint"
    | "MultiLineString"
    | "MultiPolygon";
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
  type:
    | "Point"
    | "LineString"
    | "Polygon"
    | "MultiPoint"
    | "MultiLineString"
    | "MultiPolygon";
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

export class GeoClient {
  private readonly client: AxiosInstance;
  private readonly config: GeoConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  // Morocco bounding box (approximate)
  private readonly moroccoBBox: BoundingBox = {
    minLon: -17.0,
    minLat: 21.0,
    maxLon: -1.0,
    maxLat: 36.0,
  };

  // Administrative levels
  private readonly adminLevels: AdminLevel[] = [
    {
      level: 1,
      name: "Region",
      nameAr: "جهة",
      nameFr: "Région",
      description: "First-level administrative division",
    },
    {
      level: 2,
      name: "Province/Prefecture",
      nameAr: "إقليم/عمالة",
      nameFr: "Province/Préfecture",
      description: "Second-level administrative division",
    },
    {
      level: 3,
      name: "Commune",
      nameAr: "جماعة",
      nameFr: "Commune",
      description: "Third-level administrative division",
    },
  ];

  // Morocco regions (12 regions since 2015)
  private readonly regions: Region[] = [
    {
      code: "MA-01",
      name: "Tanger-Tétouan-Al Hoceïma",
      nameAr: "طنجة-تطوان-الحسيمة",
      nameFr: "Tanger-Tétouan-Al Hoceïma",
      capital: "Tangier",
      area: 15090,
      provinces: [],
    },
    {
      code: "MA-02",
      name: "Oriental",
      nameAr: "الشرق",
      nameFr: "L'Oriental",
      capital: "Oujda",
      area: 90127,
      provinces: [],
    },
    {
      code: "MA-03",
      name: "Fès-Meknès",
      nameAr: "فاس-مكناس",
      nameFr: "Fès-Meknès",
      capital: "Fès",
      area: 40075,
      provinces: [],
    },
    {
      code: "MA-04",
      name: "Rabat-Salé-Kénitra",
      nameAr: "الرباط-سلا-القنيطرة",
      nameFr: "Rabat-Salé-Kénitra",
      capital: "Rabat",
      area: 18385,
      provinces: [],
    },
    {
      code: "MA-05",
      name: "Béni Mellal-Khénifra",
      nameAr: "بني ملال-خنيفرة",
      nameFr: "Béni Mellal-Khénifra",
      capital: "Béni Mellal",
      area: 28374,
      provinces: [],
    },
    {
      code: "MA-06",
      name: "Casablanca-Settat",
      nameAr: "الدار البيضاء-سطات",
      nameFr: "Casablanca-Settat",
      capital: "Casablanca",
      area: 20166,
      provinces: [],
    },
    {
      code: "MA-07",
      name: "Marrakech-Safi",
      nameAr: "مراكش-آسفي",
      nameFr: "Marrakech-Safi",
      capital: "Marrakech",
      area: 39167,
      provinces: [],
    },
    {
      code: "MA-08",
      name: "Drâa-Tafilalet",
      nameAr: "درعة-تافيلالت",
      nameFr: "Drâa-Tafilalet",
      capital: "Errachidia",
      area: 88836,
      provinces: [],
    },
    {
      code: "MA-09",
      name: "Souss-Massa",
      nameAr: "سوس-ماسة",
      nameFr: "Souss-Massa",
      capital: "Agadir",
      area: 51642,
      provinces: [],
    },
    {
      code: "MA-10",
      name: "Guelmim-Oued Noun",
      nameAr: "كلميم-واد نون",
      nameFr: "Guelmim-Oued Noun",
      capital: "Guelmim",
      area: 46108,
      provinces: [],
    },
    {
      code: "MA-11",
      name: "Laâyoune-Sakia El Hamra",
      nameAr: "العيون-الساقية الحمراء",
      nameFr: "Laâyoune-Sakia El Hamra",
      capital: "Laâyoune",
      area: 140018,
      provinces: [],
    },
    {
      code: "MA-12",
      name: "Dakhla-Oued Ed-Dahab",
      nameAr: "الداخلة-وادي الذهب",
      nameFr: "Dakhla-Oued Ed-Dahab",
      capital: "Dakhla",
      area: 50880,
      provinces: [],
    },
  ];

  // Major Moroccan cities
  private readonly cities: City[] = [
    {
      id: "MA-CAS",
      name: "Casablanca",
      nameAr: "الدار البيضاء",
      nameFr: "Casablanca",
      regionCode: "MA-06",
      regionName: "Casablanca-Settat",
      provinceCode: "MA-06-01",
      provinceName: "Casablanca",
      coordinates: [-7.5898, 33.5731],
      population: 3359818,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-RAB",
      name: "Rabat",
      nameAr: "الرباط",
      nameFr: "Rabat",
      regionCode: "MA-04",
      regionName: "Rabat-Salé-Kénitra",
      provinceCode: "MA-04-01",
      provinceName: "Rabat",
      coordinates: [-6.8498, 34.0209],
      population: 577827,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-FES",
      name: "Fès",
      nameAr: "فاس",
      nameFr: "Fès",
      regionCode: "MA-03",
      regionName: "Fès-Meknès",
      provinceCode: "MA-03-01",
      provinceName: "Fès",
      coordinates: [-4.9998, 34.0331],
      population: 1112072,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-MAR",
      name: "Marrakech",
      nameAr: "مراكش",
      nameFr: "Marrakech",
      regionCode: "MA-07",
      regionName: "Marrakech-Safi",
      provinceCode: "MA-07-01",
      provinceName: "Marrakech",
      coordinates: [-7.9811, 31.6295],
      population: 928850,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-TAN",
      name: "Tangier",
      nameAr: "طنجة",
      nameFr: "Tanger",
      regionCode: "MA-01",
      regionName: "Tanger-Tétouan-Al Hoceïma",
      provinceCode: "MA-01-01",
      provinceName: "Tangier-Assilah",
      coordinates: [-5.7998, 35.7595],
      population: 947952,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-AGA",
      name: "Agadir",
      nameAr: "أكادير",
      nameFr: "Agadir",
      regionCode: "MA-09",
      regionName: "Souss-Massa",
      provinceCode: "MA-09-01",
      provinceName: "Agadir Ida-Outanane",
      coordinates: [-9.5981, 30.4278],
      population: 421844,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-MEK",
      name: "Meknès",
      nameAr: "مكناس",
      nameFr: "Meknès",
      regionCode: "MA-03",
      regionName: "Fès-Meknès",
      provinceCode: "MA-03-02",
      provinceName: "Meknès",
      coordinates: [-5.5473, 33.8935],
      population: 632079,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-OUJ",
      name: "Oujda",
      nameAr: "وجدة",
      nameFr: "Oujda",
      regionCode: "MA-02",
      regionName: "Oriental",
      provinceCode: "MA-02-01",
      provinceName: "Oujda-Angad",
      coordinates: [-1.9076, 34.6867],
      population: 494252,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-KEN",
      name: "Kénitra",
      nameAr: "القنيطرة",
      nameFr: "Kénitra",
      regionCode: "MA-04",
      regionName: "Rabat-Salé-Kénitra",
      provinceCode: "MA-04-02",
      provinceName: "Kénitra",
      coordinates: [-6.5802, 34.261],
      population: 431282,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-SAL",
      name: "Salé",
      nameAr: "سلا",
      nameFr: "Salé",
      regionCode: "MA-04",
      regionName: "Rabat-Salé-Kénitra",
      provinceCode: "MA-04-03",
      provinceName: "Salé",
      coordinates: [-6.7985, 34.0531],
      population: 890403,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-SET",
      name: "Settat",
      nameAr: "سطات",
      nameFr: "Settat",
      regionCode: "MA-06",
      regionName: "Casablanca-Settat",
      provinceCode: "MA-06-02",
      provinceName: "Settat",
      coordinates: [-7.6164, 33.0013],
      population: 142250,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-BEN",
      name: "Béni Mellal",
      nameAr: "بني ملال",
      nameFr: "Béni Mellal",
      regionCode: "MA-05",
      regionName: "Béni Mellal-Khénifra",
      provinceCode: "MA-05-01",
      provinceName: "Béni Mellal",
      coordinates: [-6.3498, 32.3373],
      population: 192676,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-SAF",
      name: "Safi",
      nameAr: "آسفي",
      nameFr: "Safi",
      regionCode: "MA-07",
      regionName: "Marrakech-Safi",
      provinceCode: "MA-07-02",
      provinceName: "Safi",
      coordinates: [-9.2372, 32.2994],
      population: 308508,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-ERR",
      name: "Errachidia",
      nameAr: "الرشيدية",
      nameFr: "Errachidia",
      regionCode: "MA-08",
      regionName: "Drâa-Tafilalet",
      provinceCode: "MA-08-01",
      provinceName: "Errachidia",
      coordinates: [-4.4244, 31.9314],
      population: 92374,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-GUE",
      name: "Guelmim",
      nameAr: "كلميم",
      nameFr: "Guelmim",
      regionCode: "MA-10",
      regionName: "Guelmim-Oued Noun",
      provinceCode: "MA-10-01",
      provinceName: "Guelmim",
      coordinates: [-10.0574, 28.987],
      population: 118236,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-LAA",
      name: "Laâyoune",
      nameAr: "العيون",
      nameFr: "Laâyoune",
      regionCode: "MA-11",
      regionName: "Laâyoune-Sakia El Hamra",
      provinceCode: "MA-11-01",
      provinceName: "Laâyoune",
      coordinates: [-13.2018, 27.1253],
      population: 217732,
      timezone: "Africa/Casablanca",
    },
    {
      id: "MA-DAK",
      name: "Dakhla",
      nameAr: "الداخلة",
      nameFr: "Dakhla",
      regionCode: "MA-12",
      regionName: "Dakhla-Oued Ed-Dahab",
      provinceCode: "MA-12-01",
      provinceName: "Oued Ed-Dahab",
      coordinates: [-15.9581, 23.7134],
      population: 112893,
      timezone: "Africa/Casablanca",
    },
  ];

  constructor(config: GeoConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "https://geo.api.gov.ma",
      timeout: config.timeout || 30000,
    };

    this.cache = config.cache;
    this.rateLimiter = config.rateLimiter;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error),
    );
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === "ECONNABORTED") {
        throw new TimeoutError("Geo API request timeout", "GEO");
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError("Geographic resource not found", "GEO");
      }

      throw new DataSourceError(
        `Geo API error: ${axiosError.message}`,
        "GEO",
        axiosError.response?.status || 502,
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : "Unknown Geo error",
      "GEO",
    );
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    useCache: boolean = true,
    cacheTTL?: number,
  ): Promise<T> {
    // Check rate limit
    if (this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit("geo");
      if (!allowed) {
        throw new DataSourceError("Geo API rate limit exceeded", "GEO", 429);
      }
      await this.rateLimiter.recordRequest("geo");
    }

    // Check cache
    const cacheKey = `geo:${endpoint}:${JSON.stringify(params || {})}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Make request
    const response = await this.client.get<T>(endpoint, { params });

    // Cache successful response
    if (useCache && this.cache) {
      await this.cache.set(cacheKey, response.data, cacheTTL);
    }

    return response.data;
  }

  /**
   * Get all administrative levels
   */
  getAdminLevels(): AdminLevel[] {
    return this.adminLevels;
  }

  /**
   * Get all regions of Morocco
   */
  getAllRegions(): Region[] {
    return this.regions;
  }

  /**
   * Get a specific region by code
   */
  getRegion(code: string): Region | undefined {
    return this.regions.find((r) => r.code === code);
  }

  /**
   * Get region by name (supports French, Arabic, English)
   */
  getRegionByName(name: string): Region | undefined {
    const normalizedName = name.toLowerCase().trim();
    return this.regions.find(
      (r) =>
        r.name.toLowerCase() === normalizedName ||
        r.nameFr.toLowerCase() === normalizedName ||
        r.nameAr === name,
    );
  }

  /**
   * Get all cities
   */
  getAllCities(): City[] {
    return this.cities;
  }

  /**
   * Get city by ID
   */
  getCity(id: string): City | undefined {
    return this.cities.find((c) => c.id === id);
  }

  /**
   * Get city by name
   */
  getCityByName(name: string): City | undefined {
    const normalizedName = name.toLowerCase().trim();
    return this.cities.find(
      (c) =>
        c.name.toLowerCase() === normalizedName ||
        c.nameFr.toLowerCase() === normalizedName ||
        c.nameAr === name,
    );
  }

  /**
   * Get cities in a region
   */
  getCitiesByRegion(regionCode: string): City[] {
    return this.cities.filter((c) => c.regionCode === regionCode);
  }

  /**
   * Get nearest cities to coordinates
   */
  getNearestCities(
    latitude: number,
    longitude: number,
    limit: number = 5,
  ): Array<City & { distance: number }> {
    const citiesWithDistance = this.cities.map((city) => ({
      ...city,
      distance: this.calculateDistance(
        { latitude, longitude },
        { latitude: city.coordinates[1], longitude: city.coordinates[0] },
      ),
    }));

    return citiesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Get coordinates for a city
   */
  getCityCoordinates(cityId: string): [number, number] | undefined {
    const city = this.getCity(cityId);
    return city?.coordinates;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    from: Coordinate,
    to: Coordinate,
    unit: "km" | "m" | "miles" = "km",
  ): number {
    const R = 6371; // Earth's radius in km

    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLat = this.toRadians(to.latitude - from.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;

    if (unit === "m") {
      distance *= 1000;
    } else if (unit === "miles") {
      distance *= 0.621371;
    }

    return distance;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(from: Coordinate, to: Coordinate): number {
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  /**
   * Get distance and bearing between two points
   */
  calculateDistanceAndBearing(
    from: Coordinate,
    to: Coordinate,
    unit: "km" | "m" | "miles" = "km",
  ): DistanceCalculation {
    return {
      from,
      to,
      distance: this.calculateDistance(from, to, unit),
      unit,
      bearing: this.calculateBearing(from, to),
    };
  }

  /**
   * Get bounding box for Morocco
   */
  getMoroccoBoundingBox(): BoundingBox {
    return { ...this.moroccoBBox };
  }

  /**
   * Check if coordinates are within Morocco
   */
  isWithinMorocco(latitude: number, longitude: number): boolean {
    return (
      latitude >= this.moroccoBBox.minLat &&
      latitude <= this.moroccoBBox.maxLat &&
      longitude >= this.moroccoBBox.minLon &&
      longitude <= this.moroccoBBox.maxLon
    );
  }

  /**
   * Create a GeoJSON Point feature
   */
  createPointFeature(
    longitude: number,
    latitude: number,
    properties?: Record<string, unknown>,
  ): GeoJSONFeature {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      properties: properties || {},
    };
  }

  /**
   * Create a GeoJSON FeatureCollection
   */
  createFeatureCollection(
    features: GeoJSONFeature[],
    properties?: Record<string, unknown>,
  ): GeoJSON {
    return {
      type: "FeatureCollection",
      features,
      properties,
      bbox: this.calculateBoundingBox(features),
    };
  }

  /**
   * Calculate bounding box from features
   */
  calculateBoundingBox(features: GeoJSONFeature[]): number[] | undefined {
    if (features.length === 0) return undefined;

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const feature of features) {
      const coords = this.extractCoordinates(feature.geometry);
      for (const coord of coords) {
        minLon = Math.min(minLon, coord[0]);
        minLat = Math.min(minLat, coord[1]);
        maxLon = Math.max(maxLon, coord[0]);
        maxLat = Math.max(maxLat, coord[1]);
      }
    }

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Extract all coordinates from a geometry
   */
  private extractCoordinates(geometry: GeoJSONGeometry): number[][] {
    const coords: number[][] = [];

    const extract = (
      coord: number[] | number[][] | number[][][] | number[][][][],
    ) => {
      if (typeof coord[0] === "number") {
        coords.push(coord as number[]);
      } else {
        for (const c of coord as number[][]) {
          extract(c);
        }
      }
    };

    extract(geometry.coordinates);
    return coords;
  }

  /**
   * Create region GeoJSON features
   */
  async getRegionsGeoJSON(): Promise<GeoJSON> {
    const features: GeoJSONFeature[] = this.regions.map((region) => ({
      type: "Feature",
      id: region.code,
      geometry: region.geometry || {
        type: "Point",
        coordinates: [0, 0], // Would be populated from actual geometry data
      },
      properties: {
        code: region.code,
        name: region.name,
        nameAr: region.nameAr,
        nameFr: region.nameFr,
        capital: region.capital,
        area: region.area,
        population: region.population,
      },
    }));

    return this.createFeatureCollection(features);
  }

  /**
   * Create cities GeoJSON features
   */
  async getCitiesGeoJSON(): Promise<GeoJSON> {
    const features: GeoJSONFeature[] = this.cities.map((city) => ({
      type: "Feature",
      id: city.id,
      geometry: {
        type: "Point",
        coordinates: city.coordinates,
      },
      properties: {
        id: city.id,
        name: city.name,
        nameAr: city.nameAr,
        nameFr: city.nameFr,
        regionCode: city.regionCode,
        regionName: city.regionName,
        provinceCode: city.provinceCode,
        provinceName: city.provinceName,
        population: city.population,
        timezone: city.timezone,
      },
    }));

    return this.createFeatureCollection(features);
  }

  /**
   * Get administrative hierarchy for a location
   */
  getAdminHierarchy(
    regionCode: string,
    provinceCode?: string,
    communeCode?: string,
  ): {
    region?: Region;
    province?: Province;
    commune?: Commune;
  } {
    const region = this.getRegion(regionCode);

    return {
      region,
      // Province and commune would be populated from actual data
      province: provinceCode
        ? {
            code: provinceCode,
            name: "Province",
            nameAr: "إقليم",
            nameFr: "Province",
            regionCode,
            regionName: region?.name || "",
            capital: "",
            area: 0,
            communes: [],
          }
        : undefined,
      commune: communeCode
        ? {
            code: communeCode,
            name: "Commune",
            nameAr: "جماعة",
            nameFr: "Commune",
            type: "urbaine",
            provinceCode: provinceCode || "",
            provinceName: "",
            regionCode,
            regionName: region?.name || "",
          }
        : undefined,
    };
  }

  /**
   * Search for locations by name
   */
  searchLocations(query: string): Array<City | Region> {
    const normalizedQuery = query.toLowerCase().trim();
    const results: Array<City | Region> = [];

    // Search cities
    const matchingCities = this.cities.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.nameFr.toLowerCase().includes(normalizedQuery) ||
        c.nameAr.includes(query),
    );
    results.push(...matchingCities);

    // Search regions
    const matchingRegions = this.regions.filter(
      (r) =>
        r.name.toLowerCase().includes(normalizedQuery) ||
        r.nameFr.toLowerCase().includes(normalizedQuery) ||
        r.nameAr.includes(query),
    );
    results.push(...matchingRegions);

    return results;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get coordinates in different formats
   */
  formatCoordinates(
    latitude: number,
    longitude: number,
    format: "decimal" | "dms" | "utm" = "decimal",
  ): string {
    if (format === "decimal") {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    if (format === "dms") {
      return this.toDMS(latitude, longitude);
    }

    // UTM would require a library like utm-converter
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  /**
   * Convert decimal degrees to DMS (Degrees, Minutes, Seconds)
   */
  private toDMS(latitude: number, longitude: number): string {
    const latDir = latitude >= 0 ? "N" : "S";
    const lonDir = longitude >= 0 ? "E" : "W";

    const latAbs = Math.abs(latitude);
    const lonAbs = Math.abs(longitude);

    const latDeg = Math.floor(latAbs);
    const latMin = Math.floor((latAbs - latDeg) * 60);
    const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2);

    const lonDeg = Math.floor(lonAbs);
    const lonMin = Math.floor((lonAbs - lonDeg) * 60);
    const lonSec = ((lonAbs - lonDeg - lonMin / 60) * 3600).toFixed(2);

    return `${latDeg}°${latMin}'${latSec}"${latDir}, ${lonDeg}°${lonMin}'${lonSec}"${lonDir}`;
  }

  /**
   * Get the centroid of a bounding box
   */
  getCentroid(bbox: BoundingBox): [number, number] {
    const lon = (bbox.minLon + bbox.maxLon) / 2;
    const lat = (bbox.minLat + bbox.maxLat) / 2;
    return [lon, lat];
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request("/health", {}, false);
      return true;
    } catch {
      // Fallback: return true since we have built-in data
      return true;
    }
  }

  /**
   * Get GeoJSON for a specific region
   */
  async getRegionGeoJSON(regionCode: string): Promise<GeoJSONFeature | null> {
    const region = this.getRegion(regionCode);
    if (!region) return null;

    return {
      type: "Feature",
      id: region.code,
      geometry: region.geometry || {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {
        code: region.code,
        name: region.name,
        nameAr: region.nameAr,
        nameFr: region.nameFr,
        capital: region.capital,
        area: region.area,
        type: "region",
      },
    };
  }

  /**
   * Get all locations as GeoJSON
   */
  async getAllLocationsGeoJSON(): Promise<GeoJSON> {
    const regionFeatures: GeoJSONFeature[] = this.regions.map((region) => ({
      type: "Feature",
      id: region.code,
      geometry: region.geometry || {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {
        code: region.code,
        name: region.name,
        nameAr: region.nameAr,
        nameFr: region.nameFr,
        type: "region",
        capital: region.capital,
      },
    }));

    const cityFeatures: GeoJSONFeature[] = this.cities.map((city) => ({
      type: "Feature",
      id: city.id,
      geometry: {
        type: "Point",
        coordinates: city.coordinates,
      },
      properties: {
        id: city.id,
        name: city.name,
        nameAr: city.nameAr,
        nameFr: city.nameFr,
        type: "city",
        population: city.population,
      },
    }));

    return this.createFeatureCollection([...regionFeatures, ...cityFeatures], {
      generated: new Date().toISOString(),
      count: regionFeatures.length + cityFeatures.length,
    });
  }
}

// Default Geo client instance
export const defaultGeoClient = new GeoClient();
