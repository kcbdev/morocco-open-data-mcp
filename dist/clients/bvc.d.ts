/**
 * Morocco Open Data MCP - BVC (Bourse de Casablanca) Client
 * Client for Casablanca Stock Exchange APIs - Morocco's primary stock market
 * Documentation: https://www.casablanca-bourse.com/bourseweb/
 */
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
export interface BVCConfig {
    baseUrl?: string;
    timeout?: number;
    cache?: Cache;
    rateLimiter?: RateLimiter;
}
export interface BVCTrade {
    symbol: string;
    name: string;
    nameAr?: string;
    sector: string;
    lastPrice: number;
    currency: string;
    change: number;
    changePercent: number;
    volume: number;
    value: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    marketCap?: number;
    pe?: number;
    dividend?: number;
    yield?: number;
    timestamp: string;
}
export interface BVCIndex {
    code: string;
    name: string;
    nameAr?: string;
    value: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    timestamp: string;
    constituents?: string[];
}
export interface BVCBond {
    isin: string;
    name: string;
    nameAr?: string;
    issuer: string;
    type: "government" | "corporate";
    maturityDate: string;
    issueDate: string;
    faceValue: number;
    couponRate: number;
    currency: string;
    lastPrice: number;
    yield: number;
    duration?: number;
    rating?: string;
    volume: number;
    timestamp: string;
}
export interface BVCMarketStats {
    date: string;
    turnover: number;
    volume: number;
    trades: number;
    advances: number;
    declines: number;
    unchanged: number;
    marketCap: number;
    currency: string;
}
export interface BVCCompanyInfo {
    symbol: string;
    name: string;
    nameAr?: string;
    sector: string;
    subsector: string;
    isin: string;
    listingDate: string;
    sharesOutstanding: number;
    freeFloat: number;
    marketCap: number;
    description?: string;
    descriptionAr?: string;
    website?: string;
    headquarters?: string;
    employees?: number;
    fiscalYearEnd: string;
    auditor?: string;
}
export interface BVCFinancialData {
    symbol: string;
    fiscalYear: number;
    period: "annual" | "quarterly";
    currency: string;
    revenue?: number;
    netIncome?: number;
    totalAssets?: number;
    totalEquity?: number;
    eps?: number;
    bookValue?: number;
    operatingIncome?: number;
    ebitda?: number;
    cashFlow?: number;
    debt?: number;
    publishedDate: string;
}
export interface BVCHistoricalPrice {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    value: number;
    adjustedClose?: number;
}
export interface BVCAnnouncement {
    id: string;
    symbol?: string;
    title: string;
    titleAr?: string;
    content?: string;
    category: "financial" | "governance" | "material" | "dividend" | "other";
    publishDate: string;
    url?: string;
    attachments?: Array<{
        name: string;
        type: string;
        url: string;
    }>;
}
export interface BVCDividend {
    symbol: string;
    exDate: string;
    recordDate: string;
    paymentDate: string;
    amount: number;
    currency: string;
    type: "ordinary" | "extraordinary" | "stock";
    fiscalYear: number;
    yield: number;
}
export interface BVCResponse<T> {
    success: boolean;
    data: T;
    metadata?: {
        source: "BVC";
        lastUpdated: string;
        marketStatus: "open" | "closed" | "suspended" | "pre-market" | "post-market";
    };
    error?: {
        code: string;
        message: string;
    };
}
export declare class BVCClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    private readonly indices;
    constructor(config?: BVCConfig);
    private handleError;
    private request;
    /**
     * Get market status (open/closed)
     */
    getMarketStatus(): Promise<{
        status: "open" | "closed" | "suspended" | "pre-market" | "post-market";
        nextOpen?: string;
        nextClose?: string;
        lastUpdate: string;
    }>;
    /**
     * Get all stock quotes (real-time or delayed)
     */
    getAllQuotes(): Promise<BVCTrade[]>;
    /**
     * Get quote for a specific stock
     */
    getQuote(symbol: string): Promise<BVCTrade>;
    /**
     * Get quotes for multiple stocks
     */
    getQuotes(symbols: string[]): Promise<BVCTrade[]>;
    /**
     * Get stock quotes by sector
     */
    getQuotesBySector(sector: string): Promise<BVCTrade[]>;
    /**
     * Get all available sectors
     */
    getSectors(): Promise<string[]>;
    /**
     * Get market indices
     */
    getIndices(): Promise<BVCIndex[]>;
    /**
     * Get specific index data
     */
    getIndex(code: string): Promise<BVCIndex>;
    /**
     * Get MASI (main index) data
     */
    getMASI(): Promise<BVCIndex>;
    /**
     * Get index historical data
     */
    getIndexHistory(code: string, startDate: string, endDate: string): Promise<BVCHistoricalPrice[]>;
    /**
     * Get daily market statistics
     */
    getMarketStats(date?: string): Promise<BVCMarketStats>;
    /**
     * Get market statistics for a date range
     */
    getMarketStatsRange(startDate: string, endDate: string): Promise<BVCMarketStats[]>;
    /**
     * Get top gainers
     */
    getTopGainers(limit?: number): Promise<BVCTrade[]>;
    /**
     * Get top losers
     */
    getTopLosers(limit?: number): Promise<BVCTrade[]>;
    /**
     * Get most active stocks by volume
     */
    getMostActiveByVolume(limit?: number): Promise<BVCTrade[]>;
    /**
     * Get most active stocks by value
     */
    getMostActiveByValue(limit?: number): Promise<BVCTrade[]>;
    /**
     * Get historical prices for a stock
     */
    getHistoricalPrices(symbol: string, startDate: string, endDate: string): Promise<BVCHistoricalPrice[]>;
    /**
     * Get company information
     */
    getCompanyInfo(symbol: string): Promise<BVCCompanyInfo>;
    /**
     * Get all listed companies
     */
    getAllCompanies(): Promise<Array<{
        symbol: string;
        name: string;
        sector: string;
    }>>;
    /**
     * Get financial data for a company
     */
    getFinancialData(symbol: string, options?: {
        fiscalYear?: number;
        period?: "annual" | "quarterly";
    }): Promise<BVCFinancialData>;
    /**
     * Get historical financial data
     */
    getFinancialHistory(symbol: string, years?: number): Promise<BVCFinancialData[]>;
    /**
     * Get bond quotes
     */
    getBonds(): Promise<BVCBond[]>;
    /**
     * Get specific bond quote
     */
    getBond(isin: string): Promise<BVCBond>;
    /**
     * Get government bonds only
     */
    getGovernmentBonds(): Promise<BVCBond[]>;
    /**
     * Get corporate bonds only
     */
    getCorporateBonds(): Promise<BVCBond[]>;
    /**
     * Get dividend information for a stock
     */
    getDividends(symbol: string): Promise<BVCDividend[]>;
    /**
     * Get upcoming dividends
     */
    getUpcomingDividends(days?: number): Promise<BVCDividend[]>;
    /**
     * Get company announcements
     */
    getAnnouncements(symbol?: string, options?: {
        category?: string;
        limit?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<BVCAnnouncement[]>;
    /**
     * Get specific announcement
     */
    getAnnouncement(id: string): Promise<BVCAnnouncement>;
    /**
     * Search for stocks by name or symbol
     */
    searchStocks(query: string, limit?: number): Promise<BVCTrade[]>;
    /**
     * Search for bonds by name or ISIN
     */
    searchBonds(query: string, limit?: number): Promise<BVCBond[]>;
    /**
     * Get trading calendar
     */
    getTradingCalendar(year?: number): Promise<Array<{
        date: string;
        type: "trading" | "holiday" | "half-day";
        name?: string;
        nameAr?: string;
    }>>;
    /**
     * Get market summary for today
     */
    getMarketSummary(): Promise<{
        date: string;
        indices: BVCIndex[];
        stats: BVCMarketStats;
        topGainers: BVCTrade[];
        topLosers: BVCTrade[];
        mostActive: BVCTrade[];
    }>;
    /**
     * Get sector performance
     */
    getSectorPerformance(): Promise<Array<{
        sector: string;
        change: number;
        changePercent: number;
        volume: number;
        value: number;
        marketCap: number;
    }>>;
    /**
     * Get block trades
     */
    getBlockTrades(date?: string): Promise<Array<{
        symbol: string;
        price: number;
        volume: number;
        value: number;
        timestamp: string;
    }>>;
    /**
     * Check if BVC API is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const defaultBVCClient: BVCClient;
//# sourceMappingURL=bvc.d.ts.map