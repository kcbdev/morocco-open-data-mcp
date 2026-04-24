/**
 * Morocco Open Data MCP - World Bank Client
 * Client for World Bank Open Data API - Morocco-specific indicators and statistics
 * Documentation: https://datahelpdesk.worldbank.org/dataconnect/
 */
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
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
    gdp: number | null;
    gdpGrowth: number | null;
    gdpPerCapita: number | null;
    inflation: number | null;
    unemployment: number | null;
    exports: number | null;
    imports: number | null;
    tradeBalance: number | null;
    population: number | null;
    povertyRate: number | null;
    literacyRate: number | null;
    lifeExpectancy: number | null;
    co2Emissions: number | null;
    renewableEnergy: number | null;
    forestArea: number | null;
}
export declare class WorldBankClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    private readonly moroccoCode;
    private readonly indicatorIds;
    constructor(config?: WorldBankConfig);
    private handleError;
    private request;
    /**
     * Get Morocco country information
     */
    getCountryInfo(): Promise<WorldBankCountry>;
    /**
     * Get indicator metadata
     */
    getIndicator(indicatorId: string): Promise<WorldBankIndicator>;
    /**
     * Get data for a specific indicator for Morocco
     */
    getData(indicatorId: string, options?: {
        startDate?: string;
        endDate?: string;
        format?: "json" | "xml";
    }): Promise<WorldBankDataPoint[]>;
    /**
     * Get GDP data for Morocco
     */
    getGDP(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get GDP growth rate for Morocco
     */
    getGDPGrowth(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get GDP per capita for Morocco
     */
    getGDPPerCapita(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get inflation rate for Morocco
     */
    getInflation(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get unemployment rate for Morocco
     */
    getUnemployment(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get exports data for Morocco
     */
    getExports(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get imports data for Morocco
     */
    getImports(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get population data for Morocco
     */
    getPopulation(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get poverty rate for Morocco
     */
    getPovertyRate(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get literacy rate for Morocco
     */
    getLiteracyRate(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get life expectancy for Morocco
     */
    getLifeExpectancy(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get CO2 emissions for Morocco
     */
    getCO2Emissions(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get renewable energy percentage for Morocco
     */
    getRenewableEnergy(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get forest area percentage for Morocco
     */
    getForestArea(years?: string): Promise<WorldBankDataPoint[]>;
    /**
     * Get comprehensive Morocco indicators summary
     */
    getMoroccoIndicatorsSummary(): Promise<MoroccoIndicators>;
    /**
     * Get data for multiple indicators at once
     */
    getMultipleIndicators(indicatorIds: string[], options?: {
        startDate?: string;
        endDate?: string;
    }): Promise<Map<string, WorldBankDataPoint[]>>;
    /**
     * Search indicators by keyword
     */
    searchIndicators(query: string, limit?: number): Promise<WorldBankIndicator[]>;
    /**
     * Get all topics/categories
     */
    getTopics(): Promise<WorldBankTopic[]>;
    /**
     * Get data by topic for Morocco
     */
    getDataByTopic(topicId: string, options?: {
        startDate?: string;
        endDate?: string;
        per_page?: number;
    }): Promise<WorldBankDataPoint[]>;
    /**
     * Get historical time series for an indicator
     */
    getTimeSeries(indicatorId: string, startYear?: number, endYear?: number): Promise<WorldBankTimeSeries>;
    /**
     * Compare Morocco with other countries
     */
    compareWithCountries(indicatorId: string, countryCodes: string[], year?: string): Promise<Map<string, WorldBankDataPoint>>;
    /**
     * Get source information
     */
    getSource(sourceId: string): Promise<{
        id: string;
        name: string;
        url: string;
        description: string;
    }>;
    /**
     * List all available sources
     */
    listSources(): Promise<Array<{
        id: string;
        name: string;
    }>>;
    /**
     * Check if World Bank API is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const defaultWorldBankClient: WorldBankClient;
//# sourceMappingURL=worldbank.d.ts.map