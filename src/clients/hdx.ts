/**
 * Morocco Open Data MCP - HDX Client
 * Client for Humanitarian Data Exchange (HDX) API
 * Documentation: https://data.humdata.org/api/3
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Cache } from '../lib/cache.js';
import { RateLimiter } from '../lib/rateLimiter.js';
import {
  DataSourceError,
  NotFoundError,
  TimeoutError,
} from '../lib/errors.js';
import { prepareForSearch } from '../lib/arabic.js';

export interface HDXConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  cache?: Cache;
  rateLimiter?: RateLimiter;
}

export interface HDXDataset {
  id: string;
  name: string;
  title: string;
  notes: string;
  license_title: string;
  license_id: string;
  private: boolean;
  state: string;
  author: string;
  author_email: string;
  maintainer: string;
  maintainer_email: string;
  organization: HDXOrganization;
  groups: HDXGroup[];
  tags: HDXTag[];
  resources: HDXResource[];
  num_resources: number;
  num_tags: number;
  metadata_created: string;
  metadata_modified: string;
  url: string;
  dataset_date: string[];
  dataset_source: string;
  location: string[];
  methodology: string;
  methodology_other: string;
  caveats: string;
  data_update_frequency: string;
  groups_count: number;
  tags_count: number;
  solr_additions: string;
  total_res_downloads?: number;
}

export interface HDXOrganization {
  id: string;
  name: string;
  title: string;
  description: string;
  image_url: string;
  created: string;
  is_organization: boolean;
  approval_status: string;
  state: string;
}

export interface HDXGroup {
  id: string;
  name: string;
  title: string;
  display_name: string;
  image_url: string;
  description: string;
}

export interface HDXTag {
  id: string;
  name: string;
  display_name: string;
  vocabulary_id: string;
  state: string;
}

export interface HDXResource {
  id: string;
  package_id: string;
  name: string;
  description: string;
  format: string;
  url: string;
  download_url: string;
  state: string;
  position: number;
  size: number;
  created: string;
  last_modified: string;
  hash: string;
  mimetype: string;
  mimetype_inner: string;
  cache_url: string;
  cache_last_updated: string;
  url_type: string;
  resource_type: string;
  datastore_active: boolean;
  description_ar?: string;
}

export interface HDXSearchResult {
  count: number;
  sort: string;
  facets: Record<string, Record<string, number>>;
  results: HDXDataset[];
  search_facets: Array<{
    title: string;
    name: string;
    items: Array<{ count: number; display_name: string; name: string }>;
  }>;
}

export interface HDXVocabulary {
  id: string;
  name: string;
  title: string;
  tags: HDXTag[];
}

export interface HDXResponse<T> {
  help?: string;
  success: boolean;
  result: T;
  error?: {
    __type: string;
    message: string;
    [key: string]: unknown;
  };
}

export class HDXClient {
  private readonly client: AxiosInstance;
  private readonly config: HDXConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  // Morocco location codes for HDX
  private readonly moroccoLocations = ['MAR', 'Morocco', 'MA'];

  constructor(config: HDXConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://data.humdata.org/api/3',
      apiKey: config.apiKey || process.env.HDX_API_KEY,
      timeout: config.timeout || 30000,
    };

    this.cache = config.cache;
    this.rateLimiter = config.rateLimiter;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': this.config.apiKey }),
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
        throw new TimeoutError('HDX request timeout', 'HDX');
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError('Resource not found on HDX', 'HDX');
      }

      throw new DataSourceError(
        `HDX API error: ${axiosError.message}`,
        'HDX',
        axiosError.response?.status || 502
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : 'Unknown HDX error',
      'HDX'
    );
  }

  private async request<T>(
    action: string,
    params?: Record<string, unknown>,
    useCache: boolean = true,
    cacheTTL?: number
  ): Promise<T> {
    // Check rate limit
    if (this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit('hdx');
      if (!allowed) {
        throw new DataSourceError('HDX rate limit exceeded', 'HDX', 429);
      }
      await this.rateLimiter.recordRequest('hdx');
    }

    // Check cache
    const cacheKey = `hdx:${action}:${JSON.stringify(params || {})}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<HDXResponse<T>>(cacheKey);
      if (cached) {
        return cached.result;
      }
    }

    // Make request
    const response = await this.client.get<HDXResponse<T>>(
      `/action/${action}`,
      { params }
    );

    if (!response.data.success) {
      throw new DataSourceError(
        response.data.error?.message || 'HDX action failed',
        'HDX'
      );
    }

    // Cache successful response
    if (useCache && this.cache) {
      await this.cache.set(cacheKey, response.data, cacheTTL);
    }

    return response.data.result;
  }

  /**
   * Search for datasets
   */
  async searchDatasets(
    query: string,
    options: {
      fq?: string;
      sort?: string;
      rows?: number;
      start?: number;
      facet?: boolean;
      facet_fields?: string[];
      include_private?: boolean;
    } = {}
  ): Promise<HDXSearchResult> {
    const normalizedQuery = prepareForSearch(query);

    // Add Morocco filter by default
    const locationFilter = options.fq
      ? `${options.fq} AND location:MAR`
      : 'location:MAR';

    return this.request<HDXSearchResult>('package_search', {
      q: normalizedQuery,
      fq: locationFilter,
      sort: options.sort || 'metadata_modified desc',
      rows: options.rows || 10,
      start: options.start || 0,
      facet: options.facet !== false,
      facet_fields: options.facet_fields || ['organization', 'groups', 'tags', 'location'],
      include_private: options.include_private || false,
    });
  }

  /**
   * Search datasets specifically for Morocco
   */
  async searchMoroccoDatasets(
    query: string,
    options: {
      rows?: number;
      sort?: string;
    } = {}
  ): Promise<HDXSearchResult> {
    return this.searchDatasets(query, {
      fq: 'location:MAR',
      rows: options.rows || 20,
      sort: options.sort || 'metadata_modified desc',
    });
  }

  /**
   * Get a specific dataset by ID or name
   */
  async getDataset(id: string, includeResources: boolean = true): Promise<HDXDataset> {
    return this.request<HDXDataset>('package_show', {
      id,
      include_datasets: includeResources,
    });
  }

  /**
   * List all datasets (with pagination)
   */
  async listDatasets(
    options: {
      limit?: number;
      offset?: number;
      all_fields?: boolean;
    } = {}
  ): Promise<string[] | HDXDataset[]> {
    return this.request<string[] | HDXDataset[]>('package_list', {
      limit: options.limit || 100,
      offset: options.offset || 0,
      all_fields: options.all_fields || false,
    });
  }

  /**
   * Get recently changed datasets
   */
  async recentlyChangedDatasets(
    sinceDate?: string
  ): Promise<{ offset: number; packages: string[] }> {
    return this.request('recently_changed_packages', {
      since_date: sinceDate,
    });
  }

  /**
   * Get a specific resource by ID
   */
  async getResource(id: string): Promise<HDXResource> {
    return this.request<HDXResource>('resource_show', { id });
  }

  /**
   * Search for resources
   */
  async searchResources(
    query: string,
    options: {
      package_id?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ count: number; results: HDXResource[] }> {
    return this.request('resource_search', {
      query: `name:${prepareForSearch(query)}`,
      package_id: options.package_id,
      limit: options.limit || 10,
      offset: options.offset || 0,
    });
  }

  /**
   * Get organization details
   */
  async getOrganization(id: string): Promise<HDXOrganization> {
    return this.request<HDXOrganization>('organization_show', { id });
  }

  /**
   * List all organizations
   */
  async listOrganizations(
    options: {
      all_fields?: boolean;
      limit?: number;
    } = {}
  ): Promise<HDXOrganization[]> {
    return this.request<HDXOrganization[]>('organization_list', {
      all_fields: options.all_fields || true,
      limit: options.limit || 100,
    });
  }

  /**
   * Get group details
   */
  async getGroup(id: string): Promise<HDXGroup> {
    return this.request<HDXGroup>('group_show', { id });
  }

  /**
   * List all groups
   */
  async listGroups(
    options: {
      all_fields?: boolean;
      limit?: number;
    } = {}
  ): Promise<HDXGroup[]> {
    return this.request<HDXGroup[]>('group_list', {
      all_fields: options.all_fields || true,
      limit: options.limit || 100,
    });
  }

  /**
   * List all tags
   */
  async listTags(
    options: {
      vocabulary_id?: string;
      all_fields?: boolean;
      limit?: number;
    } = {}
  ): Promise<HDXTag[]> {
    return this.request<HDXTag[]>('tag_list', {
      vocabulary_id: options.vocabulary_id,
      all_fields: options.all_fields || true,
      limit: options.limit || 100,
    });
  }

  /**
   * Get tag details
   */
  async getTag(id: string): Promise<HDXTag> {
    return this.request<HDXTag>('tag_show', { id });
  }

  /**
   * Get vocabulary (tag category)
   */
  async getVocabulary(id: string): Promise<HDXVocabulary> {
    return this.request<HDXVocabulary>('vocabulary_show', { id });
  }

  /**
   * List all vocabularies
   */
  async listVocabularies(): Promise<HDXVocabulary[]> {
    return this.request<HDXVocabulary[]>('vocabulary_list', {});
  }

  /**
   * Search datasets by tag
   */
  async searchByTag(tag: string): Promise<HDXSearchResult> {
    return this.searchDatasets('', {
      fq: `tags:${tag}`,
      rows: 50,
    });
  }

  /**
   * Search datasets by organization
   */
  async searchByOrganization(orgId: string): Promise<HDXSearchResult> {
    return this.searchDatasets('', {
      fq: `organization:${orgId}`,
      rows: 50,
    });
  }

  /**
   * Search datasets by group
   */
  async searchByGroup(groupId: string): Promise<HDXSearchResult> {
    return this.searchDatasets('', {
      fq: `groups:${groupId}`,
      rows: 50,
    });
  }

  /**
   * Get dataset statistics
   */
  async getDatasetStats(): Promise<{
    package_count: number;
    resource_count: number;
    organization_count: number;
    group_count: number;
    tag_count: number;
  }> {
    const [packages, resources, organizations, groups, tags] = await Promise.all([
      this.request<string[]>('package_list', { limit: 1 }),
      this.request('resource_search', { query: '*:*', limit: 1 }),
      this.request('organization_list', { all_fields: false, limit: 1 }),
      this.request('group_list', { all_fields: false, limit: 1 }),
      this.request('tag_list', { all_fields: false, limit: 1 }),
    ]);

    return {
      package_count: Array.isArray(packages) ? packages.length : 0,
      resource_count: typeof resources === 'object' && resources !== null && 'count' in resources ? (resources as { count: number }).count : 0,
      organization_count: Array.isArray(organizations) ? organizations.length : 0,
      group_count: Array.isArray(groups) ? groups.length : 0,
      tag_count: Array.isArray(tags) ? tags.length : 0,
    };
  }

  /**
   * Download resource data (for file resources)
   */
  async downloadResource(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.config.timeout,
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new DataSourceError(
        `Failed to download resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'HDX'
      );
    }
  }

  /**
   * Get resource view data (for DataStore enabled resources)
   */
  async getResourceView(resourceId: string): Promise<unknown> {
    return this.request('datastore_search', {
      resource_id: resourceId,
      limit: 100,
    });
  }

  /**
   * Get Morocco-specific humanitarian indicators
   */
  async getMoroccoHumanitarianIndicators(): Promise<{
    datasets: HDXDataset[];
    totalDownloads: number;
    organizations: string[];
    lastUpdated: string;
  }> {
    const searchResult = await this.searchMoroccoDatasets('', { rows: 50 });

    const totalDownloads = searchResult.results.reduce(
      (sum, dataset) => sum + (dataset.total_res_downloads || 0),
      0
    );

    const organizations = Array.from(
      new Set(searchResult.results.map(d => d.organization?.title).filter(Boolean))
    ) as string[];

    const lastUpdated = searchResult.results.length > 0
      ? searchResult.results[0].metadata_modified
      : new Date().toISOString();

    return {
      datasets: searchResult.results,
      totalDownloads,
      organizations,
      lastUpdated,
    };
  }

  /**
   * Get disaster/emergency data for Morocco
   */
  async getMoroccoDisasterData(): Promise<HDXSearchResult> {
    return this.searchMoroccoDatasets('disaster OR emergency OR crisis', {
      rows: 20,
    });
  }

  /**
   * Get refugee/migration data for Morocco
   */
  async getMoroccoMigrationData(): Promise<HDXSearchResult> {
    return this.searchMoroccoDatasets('refugee OR migration OR displacement', {
      rows: 20,
    });
  }

  /**
   * Get health/humanitarian data for Morocco
   */
  async getMoroccoHealthData(): Promise<HDXSearchResult> {
    return this.searchMoroccoDatasets('health OR epidemic OR vaccination', {
      rows: 20,
    });
  }

  /**
   * Get food security data for Morocco
   */
  async getMoroccoFoodSecurityData(): Promise<HDXSearchResult> {
    return this.searchMoroccoDatasets('food security OR nutrition OR famine', {
      rows: 20,
    });
  }

  /**
   * Get climate/hazard data for Morocco
   */
  async getMoroccoClimateData(): Promise<HDXSearchResult> {
    return this.searchMoroccoDatasets('climate OR drought OR flood OR hazard', {
      rows: 20,
    });
  }

  /**
   * Get datasets by date range
   */
  async getDatasetsByDateRange(
    startDate: string,
    endDate: string,
    options: {
      rows?: number;
    } = {}
  ): Promise<HDXSearchResult> {
    return this.searchDatasets('', {
      fq: `metadata_created:[${startDate} TO ${endDate}]`,
      rows: options.rows || 50,
    });
  }

  /**
   * Get popular datasets (by download count)
   */
  async getPopularDatasets(limit: number = 10): Promise<HDXDataset[]> {
    const result = await this.searchDatasets('', {
      sort: 'total_res_downloads desc',
      rows: limit,
    });
    return result.results;
  }

  /**
   * Get Morocco popular datasets
   */
  async getMoroccoPopularDatasets(limit: number = 10): Promise<HDXDataset[]> {
    const result = await this.searchMoroccoDatasets('', {
      sort: 'total_res_downloads desc',
      rows: limit,
    });
    return result.results;
  }

  /**
   * Check if HDX API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request('status_show', {}, false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API status
   */
  async getStatus(): Promise<{
    status: string;
    version: string;
    lastUpdate: string;
  }> {
    return this.request('status_show', {}, false);
  }
}

// Default HDX client instance
export const defaultHDXClient = new HDXClient();
