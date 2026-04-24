/**
 * Morocco Open Data MCP - BVC (Bourse de Casablanca) Client
 * Client for Casablanca Stock Exchange APIs - Morocco's primary stock market
 * Documentation: https://www.casablanca-bourse.com/bourseweb/
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
import { DataSourceError, NotFoundError, TimeoutError } from "../lib/errors.js";

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
    marketStatus:
      | "open"
      | "closed"
      | "suspended"
      | "pre-market"
      | "post-market";
  };
  error?: {
    code: string;
    message: string;
  };
}

export class BVCClient {
  private readonly client: AxiosInstance;
  private readonly config: BVCConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  // Major indices
  private readonly indices = {
    masi: "MASI", // All Shares Index
    masix: "MASIX", // Most Active Shares Index
    msi: "MSI", // Most Liquid Index
    macy: "MACY", // Continuous Market Index
  };

  constructor(config: BVCConfig = {}) {
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

    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error),
    );
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === "ECONNABORTED") {
        throw new TimeoutError("BVC request timeout", "BVC");
      }

      if (
        axiosError.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        axiosError.code === "CERT_HAS_EXPIRED" ||
        axiosError.code === "SELF_SIGNED_CERT"
      ) {
        console.error(`[BVC] SSL certificate error: ${axiosError.code}`);
        throw new DataSourceError(
          `BVC SSL certificate error: ${axiosError.code}. The Casablanca Stock Exchange API may have certificate issues.`,
          "BVC",
          502,
        );
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError("Resource not found on BVC", "BVC");
      }

      throw new DataSourceError(
        `BVC API error: ${axiosError.message}`,
        "BVC",
        axiosError.response?.status || 502,
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : "Unknown BVC error",
      "BVC",
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
      const allowed = await this.rateLimiter.checkLimit("bvc");
      if (!allowed) {
        throw new DataSourceError("BVC rate limit exceeded", "BVC", 429);
      }
      await this.rateLimiter.recordRequest("bvc");
    }

    // Check cache
    const cacheKey = `bvc:${endpoint}:${JSON.stringify(params || {})}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<BVCResponse<T>>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    // Make request
    const response = await this.client.get<BVCResponse<T>>(endpoint, {
      params,
    });

    if (!response.data.success) {
      throw new DataSourceError(
        response.data.error?.message || "BVC request failed",
        "BVC",
      );
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
  async getMarketStatus(): Promise<{
    status: "open" | "closed" | "suspended" | "pre-market" | "post-market";
    nextOpen?: string;
    nextClose?: string;
    lastUpdate: string;
  }> {
    return this.request("/market/status", {}, true, 60);
  }

  /**
   * Get all stock quotes (real-time or delayed)
   */
  async getAllQuotes(): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>("/quotes/all", {}, true, 30);
  }

  /**
   * Get quote for a specific stock
   */
  async getQuote(symbol: string): Promise<BVCTrade> {
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
  async getQuotes(symbols: string[]): Promise<BVCTrade[]> {
    const allQuotes = await this.getAllQuotes();
    const upperSymbols = symbols.map((s) => s.toUpperCase());
    return allQuotes.filter((q) => upperSymbols.includes(q.symbol));
  }

  /**
   * Get stock quotes by sector
   */
  async getQuotesBySector(sector: string): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>("/quotes/sector", { sector });
  }

  /**
   * Get all available sectors
   */
  async getSectors(): Promise<string[]> {
    return this.request<string[]>("/sectors", {}, true, 86400);
  }

  /**
   * Get market indices
   */
  async getIndices(): Promise<BVCIndex[]> {
    return this.request<BVCIndex[]>("/indices", {}, true, 60);
  }

  /**
   * Get specific index data
   */
  async getIndex(code: string): Promise<BVCIndex> {
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
  async getMASI(): Promise<BVCIndex> {
    return this.getIndex(this.indices.masi);
  }

  /**
   * Get index historical data
   */
  async getIndexHistory(
    code: string,
    startDate: string,
    endDate: string,
  ): Promise<BVCHistoricalPrice[]> {
    return this.request<BVCHistoricalPrice[]>(`/indices/${code}/history`, {
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Get daily market statistics
   */
  async getMarketStats(date?: string): Promise<BVCMarketStats> {
    return this.request<BVCMarketStats>(
      "/market/stats",
      {
        date: date || new Date().toISOString().split("T")[0],
      },
      true,
      300,
    );
  }

  /**
   * Get market statistics for a date range
   */
  async getMarketStatsRange(
    startDate: string,
    endDate: string,
  ): Promise<BVCMarketStats[]> {
    return this.request<BVCMarketStats[]>("/market/stats/range", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Get top gainers
   */
  async getTopGainers(limit: number = 10): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>("/market/top-gainers", { limit }, true, 60);
  }

  /**
   * Get top losers
   */
  async getTopLosers(limit: number = 10): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>("/market/top-losers", { limit }, true, 60);
  }

  /**
   * Get most active stocks by volume
   */
  async getMostActiveByVolume(limit: number = 10): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>(
      "/market/most-active-volume",
      { limit },
      true,
      60,
    );
  }

  /**
   * Get most active stocks by value
   */
  async getMostActiveByValue(limit: number = 10): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>(
      "/market/most-active-value",
      { limit },
      true,
      60,
    );
  }

  /**
   * Get historical prices for a stock
   */
  async getHistoricalPrices(
    symbol: string,
    startDate: string,
    endDate: string,
  ): Promise<BVCHistoricalPrice[]> {
    return this.request<BVCHistoricalPrice[]>(`/quotes/${symbol}/history`, {
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Get company information
   */
  async getCompanyInfo(symbol: string): Promise<BVCCompanyInfo> {
    return this.request<BVCCompanyInfo>(
      `/companies/${symbol}`,
      {},
      true,
      86400,
    );
  }

  /**
   * Get all listed companies
   */
  async getAllCompanies(): Promise<
    Array<{ symbol: string; name: string; sector: string }>
  > {
    return this.request<
      Array<{ symbol: string; name: string; sector: string }>
    >("/companies", {}, true, 86400);
  }

  /**
   * Get financial data for a company
   */
  async getFinancialData(
    symbol: string,
    options: {
      fiscalYear?: number;
      period?: "annual" | "quarterly";
    } = {},
  ): Promise<BVCFinancialData> {
    return this.request<BVCFinancialData>(`/companies/${symbol}/financial`, {
      fiscal_year: options.fiscalYear,
      period: options.period || "annual",
    });
  }

  /**
   * Get historical financial data
   */
  async getFinancialHistory(
    symbol: string,
    years: number = 5,
  ): Promise<BVCFinancialData[]> {
    return this.request<BVCFinancialData[]>(
      `/companies/${symbol}/financial/history`,
      {
        years,
      },
    );
  }

  /**
   * Get bond quotes
   */
  async getBonds(): Promise<BVCBond[]> {
    return this.request<BVCBond[]>("/bonds", {}, true, 300);
  }

  /**
   * Get specific bond quote
   */
  async getBond(isin: string): Promise<BVCBond> {
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
  async getGovernmentBonds(): Promise<BVCBond[]> {
    return this.request<BVCBond[]>("/bonds/government", {}, true, 300);
  }

  /**
   * Get corporate bonds only
   */
  async getCorporateBonds(): Promise<BVCBond[]> {
    return this.request<BVCBond[]>("/bonds/corporate", {}, true, 300);
  }

  /**
   * Get dividend information for a stock
   */
  async getDividends(symbol: string): Promise<BVCDividend[]> {
    return this.request<BVCDividend[]>(
      `/companies/${symbol}/dividends`,
      {},
      true,
      3600,
    );
  }

  /**
   * Get upcoming dividends
   */
  async getUpcomingDividends(days: number = 30): Promise<BVCDividend[]> {
    return this.request<BVCDividend[]>(
      "/market/dividends/upcoming",
      { days },
      true,
      3600,
    );
  }

  /**
   * Get company announcements
   */
  async getAnnouncements(
    symbol?: string,
    options: {
      category?: string;
      limit?: number;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<BVCAnnouncement[]> {
    const params: Record<string, unknown> = {
      limit: options.limit || 20,
    };

    if (symbol) params.symbol = symbol;
    if (options.category) params.category = options.category;
    if (options.startDate) params.start_date = options.startDate;
    if (options.endDate) params.end_date = options.endDate;

    return this.request<BVCAnnouncement[]>("/announcements", params, true, 300);
  }

  /**
   * Get specific announcement
   */
  async getAnnouncement(id: string): Promise<BVCAnnouncement> {
    return this.request<BVCAnnouncement>(`/announcements/${id}`, {}, false);
  }

  /**
   * Search for stocks by name or symbol
   */
  async searchStocks(query: string, limit: number = 10): Promise<BVCTrade[]> {
    return this.request<BVCTrade[]>("/search/stocks", { q: query, limit });
  }

  /**
   * Search for bonds by name or ISIN
   */
  async searchBonds(query: string, limit: number = 10): Promise<BVCBond[]> {
    return this.request<BVCBond[]>("/search/bonds", { q: query, limit });
  }

  /**
   * Get trading calendar
   */
  async getTradingCalendar(year?: number): Promise<
    Array<{
      date: string;
      type: "trading" | "holiday" | "half-day";
      name?: string;
      nameAr?: string;
    }>
  > {
    return this.request(
      `/market/calendar`,
      {
        year: year || new Date().getFullYear(),
      },
      true,
      86400,
    );
  }

  /**
   * Get market summary for today
   */
  async getMarketSummary(): Promise<{
    date: string;
    indices: BVCIndex[];
    stats: BVCMarketStats;
    topGainers: BVCTrade[];
    topLosers: BVCTrade[];
    mostActive: BVCTrade[];
  }> {
    const [indices, stats, topGainers, topLosers, mostActive] =
      await Promise.all([
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
  async getSectorPerformance(): Promise<
    Array<{
      sector: string;
      change: number;
      changePercent: number;
      volume: number;
      value: number;
      marketCap: number;
    }>
  > {
    return this.request("/market/sector-performance", {}, true, 60);
  }

  /**
   * Get block trades
   */
  async getBlockTrades(date?: string): Promise<
    Array<{
      symbol: string;
      price: number;
      volume: number;
      value: number;
      timestamp: string;
    }>
  > {
    return this.request(
      "/market/block-trades",
      {
        date: date || new Date().toISOString().split("T")[0],
      },
      true,
      300,
    );
  }

  /**
   * Check if BVC API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getMarketStatus();
      return true;
    } catch {
      return false;
    }
  }
}

// Default BVC client instance
export const defaultBVCClient = new BVCClient();
