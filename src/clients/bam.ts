/**
 * Morocco Open Data MCP - Bank Al-Maghrib (BAM) Client
 * Client for Bank Al-Maghrib APIs - Morocco's central bank
 * Documentation: https://www.bkam.ma/en/Statistical-Data
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Cache } from '../lib/cache.js';
import { RateLimiter } from '../lib/rateLimiter.js';
import {
  DataSourceError,
  NotFoundError,
  TimeoutError,
  AuthenticationError,
} from '../lib/errors.js';

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

export class BAMClient {
  private readonly client: AxiosInstance;
  private readonly config: BAMConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  constructor(config: BAMConfig = {}) {
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

    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNABORTED') {
        throw new TimeoutError('BAM request timeout', 'BAM');
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError('Resource not found on BAM', 'BAM');
      }

      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        throw new AuthenticationError('BAM API authentication failed', 'BAM');
      }

      throw new DataSourceError(
        `BAM API error: ${axiosError.message}`,
        'BAM',
        axiosError.response?.status || 502
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : 'Unknown BAM error',
      'BAM'
    );
  }

  private async request<T>(
    endpoint: string,
    apiKey?: string,
    params?: Record<string, unknown>,
    useCache: boolean = true,
    cacheTTL?: number
  ): Promise<T> {
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
      const cached = await this.cache.get<BAMResponse<T>>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    // Make request
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await this.client.get<BAMResponse<T>>(endpoint, {
      params,
      headers,
    });

    if (!response.data.success) {
      throw new DataSourceError(
        response.data.error?.message || 'BAM request failed',
        'BAM'
      );
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
  async getExchangeRates(date?: string): Promise<BAMExchangeRate[]> {
    return this.request<BAMExchangeRate[]>('/exchange-rates', undefined, {
      date: date || new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Get exchange rate for a specific currency
   */
  async getExchangeRate(currency: string, date?: string): Promise<BAMExchangeRate> {
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
  async getExchangeRateHistory(
    currency: string,
    startDate: string,
    endDate: string
  ): Promise<BAMExchangeRateHistory> {
    return this.request<BAMExchangeRateHistory>(`/exchange-rates/${currency}/history`, undefined, {
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Get key interest rate (Taux Directeur)
   */
  async getKeyInterestRate(): Promise<BAMInterestRate> {
    return this.request<BAMInterestRate>('/interest-rates/key', undefined, {}, true, 3600);
  }

  /**
   * Get all interest rates (monetary policy rates)
   */
  async getInterestRates(): Promise<BAMInterestRate[]> {
    return this.request<BAMInterestRate[]>('/interest-rates', undefined, {}, true, 3600);
  }

  /**
   * Get foreign reserve data
   */
  async getReserves(period?: string): Promise<BAMReserveData[]> {
    return this.request<BAMReserveData[]>('/reserves', undefined, {
      period: period || 'monthly',
    });
  }

  /**
   * Get money supply aggregates (M1, M2, M3)
   */
  async getMoneySupply(startDate?: string, endDate?: string): Promise<BAMMoneySupplyData[]> {
    return this.request<BAMMoneySupplyData[]>('/money-supply', undefined, {
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Get inflation data (Consumer Price Index)
   */
  async getInflationData(year?: string): Promise<BAMInflationData[]> {
    return this.request<BAMInflationData[]>('/inflation', undefined, {
      year: year || new Date().getFullYear().toString(),
    });
  }

  /**
   * Get treasury bills auction results
   */
  async getTreasuryBills(
    options: {
      type?: string;
      maturity?: string;
      limit?: number;
    } = {}
  ): Promise<BAMTreasuryBill[]> {
    return this.request<BAMTreasuryBill[]>(
      '/treasury-bills',
      this.config.apiKeyTbills,
      {
        type: options.type,
        maturity: options.maturity,
        limit: options.limit || 20,
      }
    );
  }

  /**
   * Get latest treasury bill auction
   */
  async getLatestTreasuryAuction(): Promise<BAMTreasuryBill[]> {
    return this.getTreasuryBills({ limit: 10 });
  }

  /**
   * Get government obligations/bonds
   */
  async getObligations(
    options: {
      type?: string;
      status?: 'active' | 'matured' | 'all';
      limit?: number;
    } = {}
  ): Promise<BAMObligation[]> {
    return this.request<BAMObligation[]>(
      '/obligations',
      this.config.apiKeyObligations,
      {
        type: options.type,
        status: options.status || 'active',
        limit: options.limit || 50,
      }
    );
  }

  /**
   * Get statistical series by ID
   */
  async getStatisticalSeries(seriesId: string): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>(`/statistics/${seriesId}`, undefined, {}, true, 7200);
  }

  /**
   * List all available statistical series
   */
  async listStatisticalSeries(): Promise<Array<{ id: string; title: string; titleAr?: string }>> {
    return this.request<Array<{ id: string; title: string; titleAr?: string }>>(
      '/statistics',
      undefined,
      {},
      true,
      86400
    );
  }

  /**
   * Get banking sector statistics
   */
  async getBankingStats(period?: string): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/statistics/banking', undefined, {
      period: period || 'monthly',
    });
  }

  /**
   * Get payment systems data
   */
  async getPaymentSystemsData(): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/statistics/payment-systems', undefined, {}, true, 3600);
  }

  /**
   * Get microfinance statistics
   */
  async getMicrofinanceStats(): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/statistics/microfinance', undefined, {}, true, 7200);
  }

  /**
   * Get insurance sector statistics
   */
  async getInsuranceStats(): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/statistics/insurance', undefined, {}, true, 7200);
  }

  /**
   * Get financial stability indicators
   */
  async getFinancialStabilityIndicators(): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/statistics/financial-stability', undefined, {}, true, 7200);
  }

  /**
   * Search for statistical data by keyword
   */
  async searchStatistics(keyword: string): Promise<BAMStatisticalSeries[]> {
    return this.request<BAMStatisticalSeries[]>('/statistics/search', undefined, {
      q: keyword,
    });
  }

  /**
   * Get BAM annual report metadata
   */
  async getAnnualReport(year: string): Promise<{
    title: string;
    titleAr?: string;
    publishDate: string;
    downloadUrl: string;
    summary: string;
  }> {
    return this.request(`/reports/annual/${year}`, undefined, {}, true, 86400);
  }

  /**
   * Get BAM financial stability report
   */
  async getFinancialStabilityReport(year?: string): Promise<{
    title: string;
    publishDate: string;
    downloadUrl: string;
    keyFindings: string[];
  }> {
    return this.request('/reports/financial-stability', undefined, {
      year: year || new Date().getFullYear().toString(),
    }, true, 86400);
  }

  /**
   * Get currency circulation data
   */
  async getCurrencyCirculation(): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/currency/circulation', undefined, {}, true, 3600);
  }

  /**
   * Get counterfeiting statistics
   */
  async getCounterfeitingStats(period?: string): Promise<BAMStatisticalSeries> {
    return this.request<BAMStatisticalSeries>('/currency/counterfeiting', undefined, {
      period: period || 'quarterly',
    });
  }

  /**
   * Check if BAM API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request('/health', undefined, {}, false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API status and rate limit info
   */
  async getStatus(): Promise<{
    status: string;
    version: string;
    lastUpdate: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      resetTime: string;
    };
  }> {
    return this.request('/status', undefined, {}, false);
  }
}

// Default BAM client instance
export const defaultBAMClient = new BAMClient();
