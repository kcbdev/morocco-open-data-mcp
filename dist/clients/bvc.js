/**
 * Morocco Open Data MCP - BVC (Bourse de Casablanca) Client
 * Client for Casablanca Stock Exchange APIs - Morocco's primary stock market
 * Documentation: https://www.casablanca-bourse.com/bourseweb/
 */
import axios from "axios";
import { DataSourceError, NotFoundError, TimeoutError } from "../lib/errors.js";
export class BVCClient {
    client;
    config;
    cache;
    rateLimiter;
    // Major indices
    indices = {
        masi: "MASI", // All Shares Index
        masix: "MASIX", // Most Active Shares Index
        msi: "MSI", // Most Liquid Index
        macy: "MACY", // Continuous Market Index
    };
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || "https://api.casablanca-bourse.com/v1",
            timeout: config.timeout || 30000,
        };
        this.cache = config.cache;
        this.rateLimiter = config.rateLimiter;
        const https = require("https");
        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true,
            }),
        });
        this.client.interceptors.response.use((response) => response, (error) => this.handleError(error));
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.code === "ECONNABORTED") {
                throw new TimeoutError("BVC request timeout", "BVC");
            }
            if (axiosError.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
                axiosError.code === "CERT_HAS_EXPIRED" ||
                axiosError.code === "SELF_SIGNED_CERT") {
                console.error(`[BVC] SSL certificate error: ${axiosError.code}`);
                throw new DataSourceError(`BVC SSL certificate error: ${axiosError.code}. The Casablanca Stock Exchange API may have certificate issues.`, "BVC", 502);
            }
            if (axiosError.response?.status === 404) {
                throw new NotFoundError("Resource not found on BVC", "BVC");
            }
            throw new DataSourceError(`BVC API error: ${axiosError.message}`, "BVC", axiosError.response?.status || 502);
        }
        throw new DataSourceError(error instanceof Error ? error.message : "Unknown BVC error", "BVC");
    }
    async request(endpoint, params, useCache = true, cacheTTL) {
        // Check rate limit
        if (this.rateLimiter) {
            const allowed = await this.rateLimiter.checkLimit("bvc");
            if (!allowed) {
                throw new DataSourceError("BVC rate limit exceeded", "BVC", 429);
            }
            await this.rateLimiter.recordRequest("bvc");
        }
        // Check cache
        const cacheKey = `bvc:${endpoint}:${JSON.stringify(params || {})}`;
        if (useCache && this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached.data;
            }
        }
        // Make request
        const response = await this.client.get(endpoint, {
            params,
        });
        if (!response.data.success) {
            throw new DataSourceError(response.data.error?.message || "BVC request failed", "BVC");
        }
        // Cache successful response
        if (useCache && this.cache) {
            await this.cache.set(cacheKey, response.data, cacheTTL);
        }
        return response.data.data;
    }
    /**
     * Get market status (open/closed)
     */
    async getMarketStatus() {
        return this.request("/market/status", {}, true, 60);
    }
    /**
     * Get all stock quotes (real-time or delayed)
     */
    async getAllQuotes() {
        return this.request("/quotes/all", {}, true, 30);
    }
    /**
     * Get quote for a specific stock
     */
    async getQuote(symbol) {
        const quotes = await this.getAllQuotes();
        const quote = quotes.find((q) => q.symbol === symbol.toUpperCase());
        if (!quote) {
            throw new NotFoundError(`Stock not found: ${symbol}`, "BVC");
        }
        return quote;
    }
    /**
     * Get quotes for multiple stocks
     */
    async getQuotes(symbols) {
        const allQuotes = await this.getAllQuotes();
        const upperSymbols = symbols.map((s) => s.toUpperCase());
        return allQuotes.filter((q) => upperSymbols.includes(q.symbol));
    }
    /**
     * Get stock quotes by sector
     */
    async getQuotesBySector(sector) {
        return this.request("/quotes/sector", { sector });
    }
    /**
     * Get all available sectors
     */
    async getSectors() {
        return this.request("/sectors", {}, true, 86400);
    }
    /**
     * Get market indices
     */
    async getIndices() {
        return this.request("/indices", {}, true, 60);
    }
    /**
     * Get specific index data
     */
    async getIndex(code) {
        const indices = await this.getIndices();
        const index = indices.find((i) => i.code === code.toUpperCase());
        if (!index) {
            throw new NotFoundError(`Index not found: ${code}`, "BVC");
        }
        return index;
    }
    /**
     * Get MASI (main index) data
     */
    async getMASI() {
        return this.getIndex(this.indices.masi);
    }
    /**
     * Get index historical data
     */
    async getIndexHistory(code, startDate, endDate) {
        return this.request(`/indices/${code}/history`, {
            start_date: startDate,
            end_date: endDate,
        });
    }
    /**
     * Get daily market statistics
     */
    async getMarketStats(date) {
        return this.request("/market/stats", {
            date: date || new Date().toISOString().split("T")[0],
        }, true, 300);
    }
    /**
     * Get market statistics for a date range
     */
    async getMarketStatsRange(startDate, endDate) {
        return this.request("/market/stats/range", {
            start_date: startDate,
            end_date: endDate,
        });
    }
    /**
     * Get top gainers
     */
    async getTopGainers(limit = 10) {
        return this.request("/market/top-gainers", { limit }, true, 60);
    }
    /**
     * Get top losers
     */
    async getTopLosers(limit = 10) {
        return this.request("/market/top-losers", { limit }, true, 60);
    }
    /**
     * Get most active stocks by volume
     */
    async getMostActiveByVolume(limit = 10) {
        return this.request("/market/most-active-volume", { limit }, true, 60);
    }
    /**
     * Get most active stocks by value
     */
    async getMostActiveByValue(limit = 10) {
        return this.request("/market/most-active-value", { limit }, true, 60);
    }
    /**
     * Get historical prices for a stock
     */
    async getHistoricalPrices(symbol, startDate, endDate) {
        return this.request(`/quotes/${symbol}/history`, {
            start_date: startDate,
            end_date: endDate,
        });
    }
    /**
     * Get company information
     */
    async getCompanyInfo(symbol) {
        return this.request(`/companies/${symbol}`, {}, true, 86400);
    }
    /**
     * Get all listed companies
     */
    async getAllCompanies() {
        return this.request("/companies", {}, true, 86400);
    }
    /**
     * Get financial data for a company
     */
    async getFinancialData(symbol, options = {}) {
        return this.request(`/companies/${symbol}/financial`, {
            fiscal_year: options.fiscalYear,
            period: options.period || "annual",
        });
    }
    /**
     * Get historical financial data
     */
    async getFinancialHistory(symbol, years = 5) {
        return this.request(`/companies/${symbol}/financial/history`, {
            years,
        });
    }
    /**
     * Get bond quotes
     */
    async getBonds() {
        return this.request("/bonds", {}, true, 300);
    }
    /**
     * Get specific bond quote
     */
    async getBond(isin) {
        const bonds = await this.getBonds();
        const bond = bonds.find((b) => b.isin === isin);
        if (!bond) {
            throw new NotFoundError(`Bond not found: ${isin}`, "BVC");
        }
        return bond;
    }
    /**
     * Get government bonds only
     */
    async getGovernmentBonds() {
        return this.request("/bonds/government", {}, true, 300);
    }
    /**
     * Get corporate bonds only
     */
    async getCorporateBonds() {
        return this.request("/bonds/corporate", {}, true, 300);
    }
    /**
     * Get dividend information for a stock
     */
    async getDividends(symbol) {
        return this.request(`/companies/${symbol}/dividends`, {}, true, 3600);
    }
    /**
     * Get upcoming dividends
     */
    async getUpcomingDividends(days = 30) {
        return this.request("/market/dividends/upcoming", { days }, true, 3600);
    }
    /**
     * Get company announcements
     */
    async getAnnouncements(symbol, options = {}) {
        const params = {
            limit: options.limit || 20,
        };
        if (symbol)
            params.symbol = symbol;
        if (options.category)
            params.category = options.category;
        if (options.startDate)
            params.start_date = options.startDate;
        if (options.endDate)
            params.end_date = options.endDate;
        return this.request("/announcements", params, true, 300);
    }
    /**
     * Get specific announcement
     */
    async getAnnouncement(id) {
        return this.request(`/announcements/${id}`, {}, false);
    }
    /**
     * Search for stocks by name or symbol
     */
    async searchStocks(query, limit = 10) {
        return this.request("/search/stocks", { q: query, limit });
    }
    /**
     * Search for bonds by name or ISIN
     */
    async searchBonds(query, limit = 10) {
        return this.request("/search/bonds", { q: query, limit });
    }
    /**
     * Get trading calendar
     */
    async getTradingCalendar(year) {
        return this.request(`/market/calendar`, {
            year: year || new Date().getFullYear(),
        }, true, 86400);
    }
    /**
     * Get market summary for today
     */
    async getMarketSummary() {
        const [indices, stats, topGainers, topLosers, mostActive] = await Promise.all([
            this.getIndices().catch(() => []),
            this.getMarketStats().catch(() => ({
                date: new Date().toISOString().split("T")[0],
                turnover: 0,
                volume: 0,
                trades: 0,
                advances: 0,
                declines: 0,
                unchanged: 0,
                marketCap: 0,
                currency: "MAD",
            })),
            this.getTopGainers(5).catch(() => []),
            this.getTopLosers(5).catch(() => []),
            this.getMostActiveByValue(5).catch(() => []),
        ]);
        return {
            date: stats.date,
            indices,
            stats,
            topGainers,
            topLosers,
            mostActive,
        };
    }
    /**
     * Get sector performance
     */
    async getSectorPerformance() {
        return this.request("/market/sector-performance", {}, true, 60);
    }
    /**
     * Get block trades
     */
    async getBlockTrades(date) {
        return this.request("/market/block-trades", {
            date: date || new Date().toISOString().split("T")[0],
        }, true, 300);
    }
    /**
     * Check if BVC API is available
     */
    async isAvailable() {
        try {
            await this.getMarketStatus();
            return true;
        }
        catch {
            return false;
        }
    }
}
// Default BVC client instance
export const defaultBVCClient = new BVCClient();
//# sourceMappingURL=bvc.js.map