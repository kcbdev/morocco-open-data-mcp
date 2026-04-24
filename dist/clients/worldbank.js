/**
 * Morocco Open Data MCP - World Bank Client
 * Client for World Bank Open Data API - Morocco-specific indicators and statistics
 * Documentation: https://datahelpdesk.worldbank.org/dataconnect/
 */
import axios from "axios";
import { DataSourceError, NotFoundError, TimeoutError } from "../lib/errors.js";
export class WorldBankClient {
    client;
    config;
    cache;
    rateLimiter;
    // Morocco country code
    moroccoCode = "MAR";
    // Common World Bank indicator IDs for Morocco
    indicatorIds = {
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
    };
    constructor(config = {}) {
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
        this.client.interceptors.response.use((response) => response, (error) => this.handleError(error));
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.code === "ECONNABORTED") {
                throw new TimeoutError("World Bank request timeout", "WORLD_BANK");
            }
            if (axiosError.response?.status === 404) {
                throw new NotFoundError("Resource not found on World Bank API", "WORLD_BANK");
            }
            throw new DataSourceError(`World Bank API error: ${axiosError.message}`, "WORLD_BANK", axiosError.response?.status || 502);
        }
        throw new DataSourceError(error instanceof Error ? error.message : "Unknown World Bank error", "WORLD_BANK");
    }
    async request(endpoint, params, useCache = true, cacheTTL) {
        // Check rate limit
        if (this.rateLimiter) {
            const allowed = await this.rateLimiter.checkLimit("worldbank");
            if (!allowed) {
                throw new DataSourceError("World Bank rate limit exceeded", "WORLD_BANK", 429);
            }
            await this.rateLimiter.recordRequest("worldbank");
        }
        // Check cache
        const cacheKey = `worldbank:${endpoint}:${JSON.stringify(params || {})}`;
        if (useCache && this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached && cached.data) {
                return cached.data;
            }
        }
        // Make request
        const response = await this.client.get(endpoint, { params });
        // World Bank API returns array [metadata, data] for most endpoints
        const responseData = Array.isArray(response.data)
            ? response.data[1]
            : response.data;
        // Cache successful response
        if (useCache && this.cache) {
            await this.cache.set(cacheKey, responseData, cacheTTL);
        }
        return responseData.data;
    }
    /**
     * Get Morocco country information
     */
    async getCountryInfo() {
        const response = await this.client.get(`/country/${this.moroccoCode}`);
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
    async getIndicator(indicatorId) {
        const response = await this.client.get(`/indicator/${indicatorId}`);
        const data = Array.isArray(response.data)
            ? response.data[1]
            : response.data;
        const indicator = data.data?.[0];
        if (!indicator) {
            throw new NotFoundError(`Indicator not found: ${indicatorId}`, "WORLD_BANK");
        }
        return indicator;
    }
    /**
     * Get data for a specific indicator for Morocco
     */
    async getData(indicatorId, options = {}) {
        return this.request(`/country/${this.moroccoCode}/indicator/${indicatorId}`, {
            date: options.startDate && options.endDate
                ? `${options.startDate}:${options.endDate}`
                : "latest",
            format: options.format || "json",
        });
    }
    /**
     * Get GDP data for Morocco
     */
    async getGDP(years) {
        return this.getData(this.indicatorIds.gdp, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get GDP growth rate for Morocco
     */
    async getGDPGrowth(years) {
        return this.getData(this.indicatorIds.gdpGrowth, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get GDP per capita for Morocco
     */
    async getGDPPerCapita(years) {
        return this.getData(this.indicatorIds.gdpPerCapita, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get inflation rate for Morocco
     */
    async getInflation(years) {
        return this.getData(this.indicatorIds.inflation, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get unemployment rate for Morocco
     */
    async getUnemployment(years) {
        return this.getData(this.indicatorIds.unemployment, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get exports data for Morocco
     */
    async getExports(years) {
        return this.getData(this.indicatorIds.exports, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get imports data for Morocco
     */
    async getImports(years) {
        return this.getData(this.indicatorIds.imports, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get population data for Morocco
     */
    async getPopulation(years) {
        return this.getData(this.indicatorIds.population, {
            startDate: years ? years : "2010",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get poverty rate for Morocco
     */
    async getPovertyRate(years) {
        return this.getData(this.indicatorIds.povertyRate, {
            startDate: years ? years : "2000",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get literacy rate for Morocco
     */
    async getLiteracyRate(years) {
        return this.getData(this.indicatorIds.literacyRate, {
            startDate: years ? years : "2000",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get life expectancy for Morocco
     */
    async getLifeExpectancy(years) {
        return this.getData(this.indicatorIds.lifeExpectancy, {
            startDate: years ? years : "2000",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get CO2 emissions for Morocco
     */
    async getCO2Emissions(years) {
        return this.getData(this.indicatorIds.co2Emissions, {
            startDate: years ? years : "2000",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get renewable energy percentage for Morocco
     */
    async getRenewableEnergy(years) {
        return this.getData(this.indicatorIds.renewableEnergy, {
            startDate: years ? years : "2000",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get forest area percentage for Morocco
     */
    async getForestArea(years) {
        return this.getData(this.indicatorIds.forestArea, {
            startDate: years ? years : "2000",
            endDate: new Date().getFullYear().toString(),
        });
    }
    /**
     * Get comprehensive Morocco indicators summary
     */
    async getMoroccoIndicatorsSummary() {
        const [gdp, gdpGrowth, gdpPerCapita, inflation, unemployment, exports, imports, population, povertyRate, literacyRate, lifeExpectancy, co2Emissions, renewableEnergy, forestArea,] = await Promise.all([
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
        const getValue = (data) => data[0]?.value ?? null;
        return {
            gdp: getValue(gdp),
            gdpGrowth: getValue(gdpGrowth),
            gdpPerCapita: getValue(gdpPerCapita),
            inflation: getValue(inflation),
            unemployment: getValue(unemployment),
            exports: getValue(exports),
            imports: getValue(imports),
            tradeBalance: exports[0]?.value !== null && imports[0]?.value !== null
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
    async getMultipleIndicators(indicatorIds, options = {}) {
        const results = new Map();
        const promises = indicatorIds.map(async (id) => {
            try {
                const data = await this.getData(id, {
                    startDate: options.startDate,
                    endDate: options.endDate,
                });
                results.set(id, data);
            }
            catch (error) {
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
    async searchIndicators(query, limit = 20) {
        const response = await this.client.get("/indicator", { params: { search: query, per_page: limit } });
        const data = Array.isArray(response.data)
            ? response.data[1]
            : response.data;
        return data.data || [];
    }
    /**
     * Get all topics/categories
     */
    async getTopics() {
        const response = await this.client.get("/topics");
        const data = Array.isArray(response.data)
            ? response.data[1]
            : response.data;
        return data.data || [];
    }
    /**
     * Get data by topic for Morocco
     */
    async getDataByTopic(topicId, options = {}) {
        return this.request(`/country/${this.moroccoCode}/topic/${topicId}/indicator`, {
            date: options.startDate && options.endDate
                ? `${options.startDate}:${options.endDate}`
                : "latest",
            per_page: options.per_page || 50,
        });
    }
    /**
     * Get historical time series for an indicator
     */
    async getTimeSeries(indicatorId, startYear = 1960, endYear = new Date().getFullYear()) {
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
            country: country,
            data,
        };
    }
    /**
     * Compare Morocco with other countries
     */
    async compareWithCountries(indicatorId, countryCodes, year = "latest") {
        const results = new Map();
        // Add Morocco to comparison
        countryCodes = [this.moroccoCode, ...countryCodes];
        const promises = countryCodes.map(async (code) => {
            try {
                const response = await this.client.get(`/country/${code}/indicator/${indicatorId}`, {
                    params: { date: year, per_page: 1 },
                });
                const data = Array.isArray(response.data)
                    ? response.data[1]
                    : response.data;
                const dataPoint = data.data?.[0];
                if (dataPoint) {
                    results.set(code, dataPoint);
                }
            }
            catch (error) {
                console.error(`Failed to fetch data for ${code}:`, error);
            }
        });
        await Promise.all(promises);
        return results;
    }
    /**
     * Get source information
     */
    async getSource(sourceId) {
        const response = await this.client.get(`/source/${sourceId}`);
        const data = Array.isArray(response.data)
            ? response.data[1]
            : response.data;
        return data.data?.[0] || {};
    }
    /**
     * List all available sources
     */
    async listSources() {
        const response = await this.client.get("/source");
        const data = Array.isArray(response.data)
            ? response.data[1]
            : response.data;
        return (data.data?.map((s) => ({
            id: s.id,
            name: s.name,
        })) || []);
    }
    /**
     * Check if World Bank API is available
     */
    async isAvailable() {
        try {
            await this.getCountryInfo();
            return true;
        }
        catch {
            return false;
        }
    }
}
// Default World Bank client instance
export const defaultWorldBankClient = new WorldBankClient();
//# sourceMappingURL=worldbank.js.map