/**
 * Morocco Open Data MCP - CKAN Client
 * Client for data.gov.ma CKAN API - Morocco's national open data portal
 * Documentation: https://data.gov.ma/data/api/3
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
import {
  DataSourceError,
  NotFoundError,
  TimeoutError,
  AuthenticationError,
  ValidationError,
} from "../lib/errors.js";
import { prepareForSearch } from "../lib/arabic.js";

export interface CKANConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  cache?: Cache;
  rateLimiter?: RateLimiter;
}

export interface CKANPackage {
  id: string;
  name: string;
  title: string;
  title_ar?: string;
  title_fr?: string;
  notes?: string;
  notes_ar?: string;
  notes_fr?: string;
  license_id?: string;
  license_title?: string;
  author?: string;
  author_email?: string;
  maintainer?: string;
  maintainer_email?: string;
  organization?: CKANOrganization;
  groups?: CKANGroup[];
  tags?: CKANTag[];
  resources?: CKANResource[];
  metadata_created: string;
  metadata_modified: string;
  state: string;
  private: boolean;
  num_resources?: number;
  num_tags?: number;
  extras?: Array<{ key: string; value: string }>;
}

export interface CKANOrganization {
  id: string;
  name: string;
  title: string;
  title_ar?: string;
  title_fr?: string;
  description?: string;
  image_url?: string;
  created: string;
  is_organization: boolean;
  approval_status: string;
  state: string;
}

export interface CKANGroup {
  id: string;
  name: string;
  title: string;
  display_name?: string;
  image_url?: string;
  description?: string;
}

export interface CKANTag {
  id: string;
  name: string;
  display_name?: string;
  vocabulary_id?: string;
  state?: string;
}

export interface CKANResource {
  id: string;
  package_id?: string;
  name: string;
  name_ar?: string;
  name_fr?: string;
  description?: string;
  description_ar?: string;
  description_fr?: string;
  format: string;
  url: string;
  download_url?: string;
  state: string;
  position: number;
  size?: number;
  created?: string;
  last_modified?: string;
  hash?: string;
  mimetype?: string;
  mimetype_inner?: string;
  cache_url?: string;
  cache_last_updated?: string;
  url_type?: string;
  resource_type?: string;
}

export interface CKANSearchResult {
  count: number;
  sort: string;
  facets: Record<string, Record<string, number>>;
  results: CKANPackage[];
  search_facets: Array<{
    title: string;
    name: string;
    items: Array<{ count: number; display_name: string; name: string }>;
  }>;
}

export interface CKANActionResponse<T> {
  help?: string;
  success: boolean;
  result: T;
  error?: {
    __type: string;
    message: string;
    [key: string]: unknown;
  };
}

export class CKANClient {
  private readonly client: AxiosInstance;
  private readonly config: CKANConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  constructor(config: CKANConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "https://data.gov.ma/data/api/3",
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
    };

    this.cache = config.cache;
    this.rateLimiter = config.rateLimiter;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.config.apiKey && { Authorization: this.config.apiKey }),
      },
      httpsAgent: new (require("https").Agent)({
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
        throw new TimeoutError("CKAN request timeout", "CKAN");
      }

      if (
        axiosError.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        axiosError.code === "CERT_HAS_EXPIRED" ||
        axiosError.code === "SELF_SIGNED_CERT"
      ) {
        console.error(`[CKAN] SSL certificate error: ${axiosError.code}`);
        throw new DataSourceError(
          `CKAN SSL certificate error: ${axiosError.code}. The data.gov.ma API may have certificate issues.`,
          "CKAN",
          502,
        );
      }

      if (axiosError.response?.status === 400) {
        console.error(`[CKAN] Bad request: ${axiosError.response.data}`);
        const errorMsg = axiosError.response?.data
          ? String(axiosError.response.data)
          : axiosError.message;
        throw new ValidationError(
          `CKAN bad request: ${errorMsg}`,
          "query",
          axiosError.config?.params,
        );
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError("Resource not found on CKAN", "CKAN");
      }

      if (axiosError.response?.status === 403) {
        throw new AuthenticationError(
          "CKAN API key invalid or missing",
          "CKAN",
        );
      }

      if (axiosError.response?.status === 503) {
        throw new DataSourceError(
          "CKAN service temporarily unavailable. The data.gov.ma portal may be down for maintenance.",
          "CKAN",
          503,
        );
      }

      throw new DataSourceError(
        `CKAN API error (${axiosError.response?.status || "unknown"}): ${axiosError.message}`,
        "CKAN",
        axiosError.response?.status || 502,
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : "Unknown CKAN error",
      "CKAN",
    );
  }

  private async request<T>(
    action: string,
    params?: Record<string, unknown>,
    useCache: boolean = true,
    cacheTTL?: number,
  ): Promise<T> {
    // Check rate limit
    if (this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit("ckan");
      if (!allowed) {
        throw new DataSourceError("CKAN rate limit exceeded", "CKAN", 429);
      }
      await this.rateLimiter.recordRequest("ckan");
    }

    // Check cache
    const cacheKey = `ckan:${action}:${JSON.stringify(params || {})}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<CKANActionResponse<T>>(cacheKey);
      if (cached) {
        return cached.result;
      }
    }

    // Make request
    const response = await this.client.get<CKANActionResponse<T>>(
      `/action/${action}`,
      { params },
    );

    if (!response.data.success) {
      throw new DataSourceError(
        response.data.error?.message || "CKAN action failed",
        "CKAN",
      );
    }

    // Cache successful response
    if (useCache && this.cache) {
      await this.cache.set(cacheKey, response.data, cacheTTL);
    }

    return response.data.result;
  }

  /**
   * Search for datasets/packages
   */
  async searchPackages(
    query: string,
    options: {
      fq?: string;
      sort?: string;
      rows?: number;
      start?: number;
      facet?: boolean;
      facet_fields?: string[];
    } = {},
  ): Promise<CKANSearchResult> {
    const normalizedQuery = prepareForSearch(query);

    // Ensure query is not empty - CKAN requires a query string
    const searchQuery = normalizedQuery.trim() || "*:*";

    return this.request<CKANSearchResult>("package_search", {
      q: searchQuery,
      fq: options.fq,
      sort: options.sort || "metadata_modified desc",
      rows: Math.min(options.rows || 10, 100), // CKAN max rows limit
      start: options.start || 0,
      facet: options.facet !== false,
      facet_fields: options.facet_fields || ["organization", "groups", "tags"],
      include_private: false,
    });
  }

  /**
   * Get a specific package by ID or name
   */
  async getPackage(
    id: string,
    includeResources: boolean = true,
  ): Promise<CKANPackage> {
    // Validate ID - CKAN package IDs are typically UUIDs or slugs
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Package ID cannot be empty", "id");
    }

    return this.request<CKANPackage>("package_show", {
      id: id.trim(),
      include_datasets: includeResources,
      include_resources: includeResources,
    });
  }

  /**
   * List all packages (with pagination)
   */
  async listPackages(
    options: {
      limit?: number;
      offset?: number;
      all_fields?: boolean;
    } = {},
  ): Promise<string[] | CKANPackage[]> {
    return this.request<string[] | CKANPackage[]>("package_list", {
      limit: options.limit || 100,
      offset: options.offset || 0,
      all_fields: options.all_fields || false,
    });
  }

  /**
   * Get recently changed packages
   */
  async recentlyChangedPackages(
    sinceDate?: string,
  ): Promise<{ offset: number; packages: string[] }> {
    return this.request("recently_changed_packages", {
      since_date: sinceDate,
    });
  }

  /**
   * Get a specific resource by ID
   */
  async getResource(id: string): Promise<CKANResource> {
    return this.request<CKANResource>("resource_show", { id });
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
    } = {},
  ): Promise<{ count: number; results: CKANResource[] }> {
    return this.request("resource_search", {
      query: `name:${prepareForSearch(query)}`,
      package_id: options.package_id,
      limit: options.limit || 10,
      offset: options.offset || 0,
    });
  }

  /**
   * Get organization details
   */
  async getOrganization(id: string): Promise<CKANOrganization> {
    return this.request<CKANOrganization>("organization_show", { id });
  }

  /**
   * List all organizations
   */
  async listOrganizations(
    options: {
      all_fields?: boolean;
      limit?: number;
    } = {},
  ): Promise<CKANOrganization[]> {
    return this.request<CKANOrganization[]>("organization_list", {
      all_fields: options.all_fields || true,
      limit: options.limit || 100,
    });
  }

  /**
   * Get group details
   */
  async getGroup(id: string): Promise<CKANGroup> {
    return this.request<CKANGroup>("group_show", { id });
  }

  /**
   * List all groups
   */
  async listGroups(
    options: {
      all_fields?: boolean;
      limit?: number;
    } = {},
  ): Promise<CKANGroup[]> {
    return this.request<CKANGroup[]>("group_list", {
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
    } = {},
  ): Promise<CKANTag[]> {
    return this.request<CKANTag[]>("tag_list", {
      vocabulary_id: options.vocabulary_id,
      all_fields: options.all_fields || true,
      limit: options.limit || 100,
    });
  }

  /**
   * Get tag details
   */
  async getTag(id: string): Promise<CKANTag> {
    return this.request<CKANTag>("tag_show", { id });
  }

  /**
   * Search packages by tag
   */
  async searchByTag(tag: string): Promise<CKANSearchResult> {
    return this.searchPackages("", {
      fq: `tags:${tag}`,
      rows: 50,
    });
  }

  /**
   * Search packages by organization
   */
  async searchByOrganization(orgId: string): Promise<CKANSearchResult> {
    return this.searchPackages("", {
      fq: `organization:${orgId}`,
      rows: 50,
    });
  }

  /**
   * Search packages by group
   */
  async searchByGroup(groupId: string): Promise<CKANSearchResult> {
    return this.searchPackages("", {
      fq: `groups:${groupId}`,
      rows: 50,
    });
  }

  /**
   * Get package statistics
   */
  async getPackageStats(): Promise<{
    package_count: number;
    resource_count: number;
    organization_count: number;
    group_count: number;
    tag_count: number;
  }> {
    const [packages, resources, organizations, groups, tags] =
      await Promise.all([
        this.request<string[]>("package_list", { limit: 1 }),
        this.request("resource_search", { query: "*:*", limit: 1 }),
        this.request("organization_list", { all_fields: false, limit: 1 }),
        this.request("group_list", { all_fields: false, limit: 1 }),
        this.request("tag_list", { all_fields: false, limit: 1 }),
      ]);

    return {
      package_count: Array.isArray(packages) ? packages.length : 0,
      resource_count:
        typeof resources === "object" &&
        resources !== null &&
        "count" in resources
          ? (resources as { count: number }).count
          : 0,
      organization_count: Array.isArray(organizations)
        ? organizations.length
        : 0,
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
        responseType: "arraybuffer",
        timeout: this.config.timeout,
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new DataSourceError(
        `Failed to download resource: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CKAN",
      );
    }
  }

  /**
   * Get resource view data (for DataStore enabled resources)
   */
  async getResourceView(resourceId: string): Promise<unknown> {
    return this.request("datastore_search", {
      resource_id: resourceId,
      limit: 100,
    });
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request("status_show", {}, false);
      return true;
    } catch {
      return false;
    }
  }
}

// Default CKAN client instance
export const defaultCKANClient = new CKANClient();
