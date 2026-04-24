/**
 * Morocco Open Data MCP - Bank Al-Maghrib (BAM) Client
 * Client for Bank Al-Maghrib APIs - Morocco's central bank
 * Documentation: https://www.bkam.ma/en/Statistical-Data
 */
import axios from 'axios';
import { DataSourceError, NotFoundError, TimeoutError, AuthenticationError, } from '../lib/errors.js';
export class BAMClient {
    client;
    config;
    cache;
    rateLimiter;
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'https://www.bkam.ma/api',
            apiKeyChanges: config.apiKeyChanges || process.env.BAM_KEY_CHANGES,
            apiKeyObligations: config.apiKeyObligations || process.env.BAM_KEY_OBLIGATIONS,
            apiKeyTbills: config.apiKeyTbills || process.env.BAM_KEY_TBILLS,
            timeout: config.timeout || 30000,
        };
        this.cache = config.cache;
        this.rateLimiter = config.rateLimiter;
        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        this.client.interceptors.response.use(response => response, error => this.handleError(error));
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.code === 'ECONNABORTED') {
                throw new TimeoutError('BAM request timeout', 'BAM');
            }
            if (axiosError.response?.status === 404) {
                throw new NotFoundError('Resource not found on BAM', 'BAM');
            }
            if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                throw new AuthenticationError('BAM API authentication failed', 'BAM');
            }
            throw new DataSourceError(`BAM API error: ${axiosError.message}`, 'BAM', axiosError.response?.status || 502);
        }
        throw new DataSourceError(error instanceof Error ? error.message : 'Unknown BAM error', 'BAM');
    }
    async request(endpoint, apiKey, params, useCache = true, cacheTTL) {
        // Check rate limit
        if (this.rateLimiter) {
            const allowed = await this.rateLimiter.checkLimit('bam');
            if (!allowed) {
                throw new DataSourceError('BAM rate limit exceeded', 'BAM', 429);
            }
            await this.rateLimiter.recordRequest('bam');
        }
        // Check cache
        const cacheKey = `bam:${endpoint}:${JSON.stringify(params || {})}`;
        if (useCache && this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached.data;
            }
        }
        // Make request
        const headers = {};
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        const response = await this.client.get(endpoint, {
            params,
            headers,
        });
        if (!response.data.success) {
            throw new DataSourceError(response.data.error?.message || 'BAM request failed', 'BAM');
        }
        // Cache successful response
        if (useCache && this.cache) {
            await this.cache.set(cacheKey, response.data, cacheTTL);
        }
        return response.data.data;
    }
    /**
     * Get current exchange rates for all currencies
     */
    async getExchangeRates(date) {
        return this.request('/exchange-rates', undefined, {
            date: date || new Date().toISOString().split('T')[0],
        });
    }
    /**
     * Get exchange rate for a specific currency
     */
    async getExchangeRate(currency, date) {
        const rates = await this.getExchangeRates(date);
        const rate = rates.find(r => r.code === currency.toUpperCase());
        if (!rate) {
            throw new NotFoundError(`Exchange rate not found for currency: ${currency}`, 'BAM');
        }
        return rate;
    }
    /**
     * Get exchange rate history for a currency
     */
    async getExchangeRateHistory(currency, startDate, endDate) {
        return this.request(`/exchange-rates/${currency}/history`, undefined, {
            start_date: startDate,
            end_date: endDate,
        });
    }
    /**
     * Get key interest rate (Taux Directeur)
     */
    async getKeyInterestRate() {
        return this.request('/interest-rates/key', undefined, {}, true, 3600);
    }
    /**
     * Get all interest rates (monetary policy rates)
     */
    async getInterestRates() {
        return this.request('/interest-rates', undefined, {}, true, 3600);
    }
    /**
     * Get foreign reserve data
     */
    async getReserves(period) {
        return this.request('/reserves', undefined, {
            period: period || 'monthly',
        });
    }
    /**
     * Get money supply aggregates (M1, M2, M3)
     */
    async getMoneySupply(startDate, endDate) {
        return this.request('/money-supply', undefined, {
            start_date: startDate,
            end_date: endDate,
        });
    }
    /**
     * Get inflation data (Consumer Price Index)
     */
    async getInflationData(year) {
        return this.request('/inflation', undefined, {
            year: year || new Date().getFullYear().toString(),
        });
    }
    /**
     * Get treasury bills auction results
     */
    async getTreasuryBills(options = {}) {
        return this.request('/treasury-bills', this.config.apiKeyTbills, {
            type: options.type,
            maturity: options.maturity,
            limit: options.limit || 20,
        });
    }
    /**
     * Get latest treasury bill auction
     */
    async getLatestTreasuryAuction() {
        return this.getTreasuryBills({ limit: 10 });
    }
    /**
     * Get government obligations/bonds
     */
    async getObligations(options = {}) {
        return this.request('/obligations', this.config.apiKeyObligations, {
            type: options.type,
            status: options.status || 'active',
            limit: options.limit || 50,
        });
    }
    /**
     * Get statistical series by ID
     */
    async getStatisticalSeries(seriesId) {
        return this.request(`/statistics/${seriesId}`, undefined, {}, true, 7200);
    }
    /**
     * List all available statistical series
     */
    async listStatisticalSeries() {
        return this.request('/statistics', undefined, {}, true, 86400);
    }
    /**
     * Get banking sector statistics
     */
    async getBankingStats(period) {
        return this.request('/statistics/banking', undefined, {
            period: period || 'monthly',
        });
    }
    /**
     * Get payment systems data
     */
    async getPaymentSystemsData() {
        return this.request('/statistics/payment-systems', undefined, {}, true, 3600);
    }
    /**
     * Get microfinance statistics
     */
    async getMicrofinanceStats() {
        return this.request('/statistics/microfinance', undefined, {}, true, 7200);
    }
    /**
     * Get insurance sector statistics
     */
    async getInsuranceStats() {
        return this.request('/statistics/insurance', undefined, {}, true, 7200);
    }
    /**
     * Get financial stability indicators
     */
    async getFinancialStabilityIndicators() {
        return this.request('/statistics/financial-stability', undefined, {}, true, 7200);
    }
    /**
     * Search for statistical data by keyword
     */
    async searchStatistics(keyword) {
        return this.request('/statistics/search', undefined, {
            q: keyword,
        });
    }
    /**
     * Get BAM annual report metadata
     */
    async getAnnualReport(year) {
        return this.request(`/reports/annual/${year}`, undefined, {}, true, 86400);
    }
    /**
     * Get BAM financial stability report
     */
    async getFinancialStabilityReport(year) {
        return this.request('/reports/financial-stability', undefined, {
            year: year || new Date().getFullYear().toString(),
        }, true, 86400);
    }
    /**
     * Get currency circulation data
     */
    async getCurrencyCirculation() {
        return this.request('/currency/circulation', undefined, {}, true, 3600);
    }
    /**
     * Get counterfeiting statistics
     */
    async getCounterfeitingStats(period) {
        return this.request('/currency/counterfeiting', undefined, {
            period: period || 'quarterly',
        });
    }
    /**
     * Check if BAM API is available
     */
    async isAvailable() {
        try {
            await this.request('/health', undefined, {}, false);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get API status and rate limit info
     */
    async getStatus() {
        return this.request('/status', undefined, {}, false);
    }
}
// Default BAM client instance
export const defaultBAMClient = new BAMClient();
//# sourceMappingURL=bam.js.map