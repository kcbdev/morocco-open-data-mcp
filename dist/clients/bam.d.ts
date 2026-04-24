/**
 * Morocco Open Data MCP - Bank Al-Maghrib (BAM) Client
 * Client for Bank Al-Maghrib APIs - Morocco's central bank
 * Documentation: https://www.bkam.ma/en/Statistical-Data
 */
import { Cache } from '../lib/cache.js';
import { RateLimiter } from '../lib/rateLimiter.js';
export interface BAMConfig {
    baseUrl?: string;
    apiKeyChanges?: string;
    apiKeyObligations?: string;
    apiKeyTbills?: string;
    timeout?: number;
    cache?: Cache;
    rateLimiter?: RateLimiter;
}
export interface BAMExchangeRate {
    currency: string;
    currencyName: string;
    currencyNameAr?: string;
    code: string;
    rate: number;
    date: string;
    previousRate?: number;
    change?: number;
    changePercent?: number;
}
export interface BAMExchangeRateHistory {
    currency: string;
    rates: Array<{
        date: string;
        rate: number;
    }>;
}
export interface BAMInterestRate {
    type: string;
    typeAr?: string;
    rate: number;
    date: string;
    previousRate?: number;
    change?: number;
}
export interface BAMReserveData {
    date: string;
    amount: number;
    currency: string;
    unit: string;
}
export interface BAMMoneySupplyData {
    date: string;
    m1: number;
    m2: number;
    m3: number;
    unit: string;
}
export interface BAMInflationData {
    date: string;
    index: number;
    variation: number;
    annualVariation: number;
    baseYear: string;
}
export interface BAMTreasuryBill {
    id: string;
    type: string;
    maturity: string;
    issueDate: string;
    maturityDate: string;
    nominalValue: number;
    interestRate: number;
    weightedAverageRate: number;
    demandAmount: number;
    allocatedAmount: number;
    allocationRate: number;
    currency: string;
}
export interface BAMObligation {
    id: string;
    type: string;
    typeAr?: string;
    issuer: string;
    issueDate: string;
    maturityDate: string;
    nominalValue: number;
    interestRate: number;
    currency: string;
    status: 'active' | 'matured' | 'cancelled';
}
export interface BAMStatisticalSeries {
    id: string;
    title: string;
    titleAr?: string;
    description?: string;
    unit: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    data: Array<{
        date: string;
        value: number;
    }>;
}
export interface BAMResponse<T> {
    success: boolean;
    data: T;
    metadata?: {
        source: string;
        lastUpdated: string;
        nextUpdate?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}
export declare class BAMClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    constructor(config?: BAMConfig);
    private handleError;
    private request;
    /**
     * Get current exchange rates for all currencies
     */
    getExchangeRates(date?: string): Promise<BAMExchangeRate[]>;
    /**
     * Get exchange rate for a specific currency
     */
    getExchangeRate(currency: string, date?: string): Promise<BAMExchangeRate>;
    /**
     * Get exchange rate history for a currency
     */
    getExchangeRateHistory(currency: string, startDate: string, endDate: string): Promise<BAMExchangeRateHistory>;
    /**
     * Get key interest rate (Taux Directeur)
     */
    getKeyInterestRate(): Promise<BAMInterestRate>;
    /**
     * Get all interest rates (monetary policy rates)
     */
    getInterestRates(): Promise<BAMInterestRate[]>;
    /**
     * Get foreign reserve data
     */
    getReserves(period?: string): Promise<BAMReserveData[]>;
    /**
     * Get money supply aggregates (M1, M2, M3)
     */
    getMoneySupply(startDate?: string, endDate?: string): Promise<BAMMoneySupplyData[]>;
    /**
     * Get inflation data (Consumer Price Index)
     */
    getInflationData(year?: string): Promise<BAMInflationData[]>;
    /**
     * Get treasury bills auction results
     */
    getTreasuryBills(options?: {
        type?: string;
        maturity?: string;
        limit?: number;
    }): Promise<BAMTreasuryBill[]>;
    /**
     * Get latest treasury bill auction
     */
    getLatestTreasuryAuction(): Promise<BAMTreasuryBill[]>;
    /**
     * Get government obligations/bonds
     */
    getObligations(options?: {
        type?: string;
        status?: 'active' | 'matured' | 'all';
        limit?: number;
    }): Promise<BAMObligation[]>;
    /**
     * Get statistical series by ID
     */
    getStatisticalSeries(seriesId: string): Promise<BAMStatisticalSeries>;
    /**
     * List all available statistical series
     */
    listStatisticalSeries(): Promise<Array<{
        id: string;
        title: string;
        titleAr?: string;
    }>>;
    /**
     * Get banking sector statistics
     */
    getBankingStats(period?: string): Promise<BAMStatisticalSeries>;
    /**
     * Get payment systems data
     */
    getPaymentSystemsData(): Promise<BAMStatisticalSeries>;
    /**
     * Get microfinance statistics
     */
    getMicrofinanceStats(): Promise<BAMStatisticalSeries>;
    /**
     * Get insurance sector statistics
     */
    getInsuranceStats(): Promise<BAMStatisticalSeries>;
    /**
     * Get financial stability indicators
     */
    getFinancialStabilityIndicators(): Promise<BAMStatisticalSeries>;
    /**
     * Search for statistical data by keyword
     */
    searchStatistics(keyword: string): Promise<BAMStatisticalSeries[]>;
    /**
     * Get BAM annual report metadata
     */
    getAnnualReport(year: string): Promise<{
        title: string;
        titleAr?: string;
        publishDate: string;
        downloadUrl: string;
        summary: string;
    }>;
    /**
     * Get BAM financial stability report
     */
    getFinancialStabilityReport(year?: string): Promise<{
        title: string;
        publishDate: string;
        downloadUrl: string;
        keyFindings: string[];
    }>;
    /**
     * Get currency circulation data
     */
    getCurrencyCirculation(): Promise<BAMStatisticalSeries>;
    /**
     * Get counterfeiting statistics
     */
    getCounterfeitingStats(period?: string): Promise<BAMStatisticalSeries>;
    /**
     * Check if BAM API is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get API status and rate limit info
     */
    getStatus(): Promise<{
        status: string;
        version: string;
        lastUpdate: string;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetTime: string;
        };
    }>;
}
export declare const defaultBAMClient: BAMClient;
//# sourceMappingURL=bam.d.ts.map