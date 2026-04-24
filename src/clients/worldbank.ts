/**
 * Morocco Open Data MCP - World Bank Client
 * Client for World Bank Open Data API - Morocco-specific indicators and statistics
 * Documentation: https://datahelpdesk.worldbank.org/dataconnect/
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
import { DataSourceError, NotFoundError, TimeoutError } from "../lib/errors.js";

export interface WorldBankConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  cache?: Cache;
  rateLimiter?: RateLimiter;
}

export interface WorldBankIndicator {
  id: string;
  name: string;
  source: string;
  sourceNote: string;
  sourceOrganization: string;
  topics: Array<{
    id: string;
    value: string;
  }>;
}

export interface WorldBankCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: {
    id: string;
    value: string;
  };
  adminregion?: {
    id: string;
    value: string;
  };
  incomeLevel: {
    id: string;
    value: string;
  };
  lendingType: {
    id: string;
    value: string;
  };
  capitalCity: string;
  longitude: string;
  latitude: string;
}

export interface WorldBankDataPoint {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

export interface WorldBankTimeSeries {
  indicator: WorldBankIndicator;
  country: WorldBankCountry;
  data: WorldBankDataPoint[];
}

export interface WorldBankResponse<T> {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  sourceid: string;
  sourcename: string;
  lastupdated: string;
  data?: T;
}

export interface WorldBankTopic {
  id: string;
  value: string;
  sourceNote: string;
  source: string;
}

export interface MoroccoIndicators {
  // Economic
  gdp: number | null;
  gdpGrowth: number | null;
  gdpPerCapita: number | null;
  inflation: number | null;
  unemployment: number | null;

  // Trade
  exports: number | null;
  imports: number | null;
  tradeBalance: number | null;

  // Social
  population: number | null;
  povertyRate: number | null;
  literacyRate: number | null;
  lifeExpectancy: number | null;

  // Environment
  co2Emissions: number | null;
  renewableEnergy: number | null;
  forestArea: number | null;
}

export class WorldBankClient {
  private readonly client: AxiosInstance;
  private readonly config: WorldBankConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  // Morocco country code
  private readonly moroccoCode = "MAR";

  // Common World Bank indicator IDs for Morocco
  private readonly indicatorIds = {
    // Economic
    gdp: "NY.GDP.MKTP.CD",
    gdpGrowth: "NY.GDP.MKTP.KD.ZG",
    gdpPerCapita: "NY.GDP.PCAP.CD",
    inflation: "FP.CPI.TOTL.ZG",
    unemployment: "SL.UEM.TOTL.ZS",

    // Trade
    exports: "TX.VAL.MRCH.CD.WT",
    imports: "TM.VAL.MRCH.CD.WT",

    // Social
    population: "SP.POP.TOTL",
    povertyRate: "SI.POV.DDAY",
    literacyRate: "SE.ADT.LITR.ZS",
    lifeExpectancy: "SP.DYN.LE00.IN",

    // Environment
    co2Emissions: "EN.ATM.CO2E.KT",
    renewableEnergy: "EG.ELC.RNEW.ZS",
    forestArea: "AG.LND.FRST.ZS",
  } as const;

  constructor(config: WorldBankConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "https://api.worldbank.org/v2",
      apiKey: config.apiKey || process.env.WORLD_BANK_API_KEY,
      timeout: config.timeout || 30000,
    };

    this.cache = config.cache;
    this.rateLimiter = config.rateLimiter;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
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
        throw new TimeoutError("World Bank request timeout", "WORLD_BANK");
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError(
          "Resource not found on World Bank API",
          "WORLD_BANK",
        );
      }

      throw new DataSourceError(
        `World Bank API error: ${axiosError.message}`,
        "WORLD_BANK",
        axiosError.response?.status || 502,
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : "Unknown World Bank error",
      "WORLD_BANK",
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
      const allowed = await this.rateLimiter.checkLimit("worldbank");
      if (!allowed) {
        throw new DataSourceError(
          "World Bank rate limit exceeded",
          "WORLD_BANK",
          429,
        );
      }
      await this.rateLimiter.recordRequest("worldbank");
    }

    // Check cache
    const cacheKey = `worldbank:${endpoint}:${JSON.stringify(params || {})}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<WorldBankResponse<T>>(cacheKey);
      if (cached && cached.data) {
        return cached.data as T;
      }
    }

    // Make request
    const response = await this.client.get<
      WorldBankResponse<T> | WorldBankResponse<T>[]
    >(endpoint, { params });

    // World Bank API returns array [metadata, data] for most endpoints
    const responseData = Array.isArray(response.data)
      ? (response.data[1] as WorldBankResponse<T>)
      : (response.data as WorldBankResponse<T>);

    // Cache successful response
    if (useCache && this.cache) {
      await this.cache.set(cacheKey, responseData, cacheTTL);
    }

    return responseData.data as T;
  }

  /**
   * Get Morocco country information
   */
  async getCountryInfo(): Promise<WorldBankCountry> {
    const response = await this.client.get<
      WorldBankResponse<WorldBankCountry[]>
    >(`/country/${this.moroccoCode}`);

    const data = Array.isArray(response.data)
      ? response.data[1]
      : response.data;
    const country = data.data?.[0];

    if (!country) {
      throw new NotFoundError("Morocco country info not found", "WORLD_BANK");
    }

    return country;
  }

  /**
   * Get indicator metadata
   */
  async getIndicator(indicatorId: string): Promise<WorldBankIndicator> {
    const response = await this.client.get<
      WorldBankResponse<WorldBankIndicator[]>
    >(`/indicator/${indicatorId}`);

    const data = Array.isArray(response.data)
      ? response.data[1]
      : response.data;
    const indicator = data.data?.[0];

    if (!indicator) {
      throw new NotFoundError(
        `Indicator not found: ${indicatorId}`,
        "WORLD_BANK",
      );
    }

    return indicator;
  }

  /**
   * Get data for a specific indicator for Morocco
   */
  async getData(
    indicatorId: string,
    options: {
      startDate?: string;
      endDate?: string;
      format?: "json" | "xml";
    } = {},
  ): Promise<WorldBankDataPoint[]> {
    return this.request<WorldBankDataPoint[]>(
      `/country/${this.moroccoCode}/indicator/${indicatorId}`,
      {
        date:
          options.startDate && options.endDate
            ? `${options.startDate}:${options.endDate}`
            : "latest",
        format: options.format || "json",
      },
    );
  }

  /**
   * Get GDP data for Morocco
   */
  async getGDP(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.gdp, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get GDP growth rate for Morocco
   */
  async getGDPGrowth(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.gdpGrowth, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get GDP per capita for Morocco
   */
  async getGDPPerCapita(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.gdpPerCapita, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get inflation rate for Morocco
   */
  async getInflation(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.inflation, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get unemployment rate for Morocco
   */
  async getUnemployment(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.unemployment, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get exports data for Morocco
   */
  async getExports(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.exports, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get imports data for Morocco
   */
  async getImports(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.imports, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get population data for Morocco
   */
  async getPopulation(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.population, {
      startDate: years ? years : "2010",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get poverty rate for Morocco
   */
  async getPovertyRate(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.povertyRate, {
      startDate: years ? years : "2000",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get literacy rate for Morocco
   */
  async getLiteracyRate(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.literacyRate, {
      startDate: years ? years : "2000",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get life expectancy for Morocco
   */
  async getLifeExpectancy(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.lifeExpectancy, {
      startDate: years ? years : "2000",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get CO2 emissions for Morocco
   */
  async getCO2Emissions(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.co2Emissions, {
      startDate: years ? years : "2000",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get renewable energy percentage for Morocco
   */
  async getRenewableEnergy(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.renewableEnergy, {
      startDate: years ? years : "2000",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get forest area percentage for Morocco
   */
  async getForestArea(years?: string): Promise<WorldBankDataPoint[]> {
    return this.getData(this.indicatorIds.forestArea, {
      startDate: years ? years : "2000",
      endDate: new Date().getFullYear().toString(),
    });
  }

  /**
   * Get comprehensive Morocco indicators summary
   */
  async getMoroccoIndicatorsSummary(): Promise<MoroccoIndicators> {
    const [
      gdp,
      gdpGrowth,
      gdpPerCapita,
      inflation,
      unemployment,
      exports,
      imports,
      population,
      povertyRate,
      literacyRate,
      lifeExpectancy,
      co2Emissions,
      renewableEnergy,
      forestArea,
    ] = await Promise.all([
      this.getGDP().catch(() => []),
      this.getGDPGrowth().catch(() => []),
      this.getGDPPerCapita().catch(() => []),
      this.getInflation().catch(() => []),
      this.getUnemployment().catch(() => []),
      this.getExports().catch(() => []),
      this.getImports().catch(() => []),
      this.getPopulation().catch(() => []),
      this.getPovertyRate().catch(() => []),
      this.getLiteracyRate().catch(() => []),
      this.getLifeExpectancy().catch(() => []),
      this.getCO2Emissions().catch(() => []),
      this.getRenewableEnergy().catch(() => []),
      this.getForestArea().catch(() => []),
    ]);

    const getValue = (data: WorldBankDataPoint[]) => data[0]?.value ?? null;

    return {
      gdp: getValue(gdp),
      gdpGrowth: getValue(gdpGrowth),
      gdpPerCapita: getValue(gdpPerCapita),
      inflation: getValue(inflation),
      unemployment: getValue(unemployment),
      exports: getValue(exports),
      imports: getValue(imports),
      tradeBalance:
        exports[0]?.value !== null && imports[0]?.value !== null
          ? (exports[0]?.value ?? 0) - (imports[0]?.value ?? 0)
          : null,
      population: getValue(population),
      povertyRate: getValue(povertyRate),
      literacyRate: getValue(literacyRate),
      lifeExpectancy: getValue(lifeExpectancy),
      co2Emissions: getValue(co2Emissions),
      renewableEnergy: getValue(renewableEnergy),
      forestArea: getValue(forestArea),
    };
  }

  /**
   * Get data for multiple indicators at once
   */
  async getMultipleIndicators(
    indicatorIds: string[],
    options: {
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<Map<string, WorldBankDataPoint[]>> {
    const results = new Map<string, WorldBankDataPoint[]>();

    const promises = indicatorIds.map(async (id) => {
      try {
        const data = await this.getData(id, {
          startDate: options.startDate,
          endDate: options.endDate,
        });
        results.set(id, data);
      } catch (error) {
        console.error(`Failed to fetch indicator ${id}:`, error);
        results.set(id, []);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Search indicators by keyword
   */
  async searchIndicators(
    query: string,
    limit: number = 20,
  ): Promise<WorldBankIndicator[]> {
    const response = await this.client.get<
      WorldBankResponse<WorldBankIndicator[]>
    >("/indicator", { params: { search: query, per_page: limit } });

    const data = Array.isArray(response.data)
      ? response.data[1]
      : response.data;
    return data.data || [];
  }

  /**
   * Get all topics/categories
   */
  async getTopics(): Promise<WorldBankTopic[]> {
    const response =
      await this.client.get<WorldBankResponse<WorldBankTopic[]>>("/topics");

    const data = Array.isArray(response.data)
      ? response.data[1]
      : response.data;
    return data.data || [];
  }

  /**
   * Get data by topic for Morocco
   */
  async getDataByTopic(
    topicId: string,
    options: {
      startDate?: string;
      endDate?: string;
      per_page?: number;
    } = {},
  ): Promise<WorldBankDataPoint[]> {
    return this.request<WorldBankDataPoint[]>(
      `/country/${this.moroccoCode}/topic/${topicId}/indicator`,
      {
        date:
          options.startDate && options.endDate
            ? `${options.startDate}:${options.endDate}`
            : "latest",
        per_page: options.per_page || 50,
      },
    );
  }

  /**
   * Get historical time series for an indicator
   */
  async getTimeSeries(
    indicatorId: string,
    startYear: number = 1960,
    endYear: number = new Date().getFullYear(),
  ): Promise<WorldBankTimeSeries> {
    const [indicator, country, data] = await Promise.all([
      this.getIndicator(indicatorId).catch(() => ({
        id: indicatorId,
        name: indicatorId,
        source: "World Bank",
        sourceNote: "",
        sourceOrganization: "World Bank",
        topics: [],
      })),
      this.getCountryInfo().catch(() => ({
        id: this.moroccoCode,
        iso2Code: "MA",
        name: "Morocco",
        region: { id: "MEA", value: "Middle East & North Africa" },
        incomeLevel: { id: "LMC", value: "Lower middle income" },
        capitalCity: "Rabat",
        longitude: "-6.8498",
        latitude: "34.0209",
      })),
      this.getData(indicatorId, {
        startDate: startYear.toString(),
        endDate: endYear.toString(),
      }),
    ]);

    return {
      indicator,
      country: country as WorldBankCountry,
      data,
    };
  }

  /**
   * Compare Morocco with other countries
   */
  async compareWithCountries(
    indicatorId: string,
    countryCodes: string[],
    year: string = "latest",
  ): Promise<Map<string, WorldBankDataPoint>> {
    const results = new Map<string, WorldBankDataPoint>();

    // Add Morocco to comparison
    countryCodes = [this.moroccoCode, ...countryCodes];

    const promises = countryCodes.map(async (code) => {
      try {
        const response = await this.client.get<
          WorldBankResponse<WorldBankDataPoint[]>
        >(`/country/${code}/indicator/${indicatorId}`, {
          params: { date: year, per_page: 1 },
        });

        const data = Array.isArray(response.data)
          ? response.data[1]
          : response.data;
        const dataPoint = data.data?.[0];

        if (dataPoint) {
          results.set(code, dataPoint);
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${code}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get source information
   */
  async getSource(sourceId: string): Promise<{
    id: string;
    name: string;
    url: string;
    description: string;
  }> {
    const response = await this.client.get(`/source/${sourceId}`);
    const data = Array.isArray(response.data)
      ? response.data[1]
      : response.data;
    return data.data?.[0] || {};
  }

  /**
   * List all available sources
   */
  async listSources(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get("/source");
    const data = Array.isArray(response.data)
      ? response.data[1]
      : response.data;
    return (
      data.data?.map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      })) || []
    );
  }

  /**
   * Check if World Bank API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getCountryInfo();
      return true;
    } catch {
      return false;
    }
  }
}

// Default World Bank client instance
export const defaultWorldBankClient = new WorldBankClient();
