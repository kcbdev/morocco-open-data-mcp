/**
 * Morocco Open Data MCP - CKAN Client
 * Client for data.gov.ma CKAN API - Morocco's national open data portal
 * Documentation: https://data.gov.ma/data/api/3
 */
import axios from "axios";
import { DataSourceError, NotFoundError, TimeoutError, AuthenticationError, } from "../lib/errors.js";
import { prepareForSearch } from "../lib/arabic.js";
export class CKANClient {
    client;
    config;
    cache;
    rateLimiter;
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || "https://data.gov.ma/data/api/3",
            apiKey: config.apiKey,
            timeout: config.timeout || 30000,
        };
        this.cache = config.cache;
        this.rateLimiter = config.rateLimiter;
        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                "Content-Type": "application/json",
                ...(this.config.apiKey && { Authorization: this.config.apiKey }),
            },
        });
        this.client.interceptors.response.use((response) => response, (error) => this.handleError(error));
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.code === "ECONNABORTED") {
                throw new TimeoutError("CKAN request timeout", "CKAN");
            }
            if (axiosError.response?.status === 404) {
                throw new NotFoundError("Resource not found on CKAN", "CKAN");
            }
            if (axiosError.response?.status === 403) {
                throw new AuthenticationError("CKAN API key invalid or missing", "CKAN");
            }
            throw new DataSourceError(`CKAN API error: ${axiosError.message}`, "CKAN", axiosError.response?.status || 502);
        }
        throw new DataSourceError(error instanceof Error ? error.message : "Unknown CKAN error", "CKAN");
    }
    async request(action, params, useCache = true, cacheTTL) {
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
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached.result;
            }
        }
        // Make request
        const response = await this.client.get(`/action/${action}`, { params });
        if (!response.data.success) {
            throw new DataSourceError(response.data.error?.message || "CKAN action failed", "CKAN");
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
    async searchPackages(query, options = {}) {
        const normalizedQuery = prepareForSearch(query);
        return this.request("package_search", {
            q: normalizedQuery,
            fq: options.fq,
            sort: options.sort || "metadata_modified desc",
            rows: options.rows || 10,
            start: options.start || 0,
            facet: options.facet !== false,
            facet_fields: options.facet_fields || ["organization", "groups", "tags"],
        });
    }
    /**
     * Get a specific package by ID or name
     */
    async getPackage(id, includeResources = true) {
        return this.request("package_show", {
            id,
            include_datasets: includeResources,
        });
    }
    /**
     * List all packages (with pagination)
     */
    async listPackages(options = {}) {
        return this.request("package_list", {
            limit: options.limit || 100,
            offset: options.offset || 0,
            all_fields: options.all_fields || false,
        });
    }
    /**
     * Get recently changed packages
     */
    async recentlyChangedPackages(sinceDate) {
        return this.request("recently_changed_packages", {
            since_date: sinceDate,
        });
    }
    /**
     * Get a specific resource by ID
     */
    async getResource(id) {
        return this.request("resource_show", { id });
    }
    /**
     * Search for resources
     */
    async searchResources(query, options = {}) {
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
    async getOrganization(id) {
        return this.request("organization_show", { id });
    }
    /**
     * List all organizations
     */
    async listOrganizations(options = {}) {
        return this.request("organization_list", {
            all_fields: options.all_fields || true,
            limit: options.limit || 100,
        });
    }
    /**
     * Get group details
     */
    async getGroup(id) {
        return this.request("group_show", { id });
    }
    /**
     * List all groups
     */
    async listGroups(options = {}) {
        return this.request("group_list", {
            all_fields: options.all_fields || true,
            limit: options.limit || 100,
        });
    }
    /**
     * List all tags
     */
    async listTags(options = {}) {
        return this.request("tag_list", {
            vocabulary_id: options.vocabulary_id,
            all_fields: options.all_fields || true,
            limit: options.limit || 100,
        });
    }
    /**
     * Get tag details
     */
    async getTag(id) {
        return this.request("tag_show", { id });
    }
    /**
     * Search packages by tag
     */
    async searchByTag(tag) {
        return this.searchPackages("", {
            fq: `tags:${tag}`,
            rows: 50,
        });
    }
    /**
     * Search packages by organization
     */
    async searchByOrganization(orgId) {
        return this.searchPackages("", {
            fq: `organization:${orgId}`,
            rows: 50,
        });
    }
    /**
     * Search packages by group
     */
    async searchByGroup(groupId) {
        return this.searchPackages("", {
            fq: `groups:${groupId}`,
            rows: 50,
        });
    }
    /**
     * Get package statistics
     */
    async getPackageStats() {
        const [packages, resources, organizations, groups, tags] = await Promise.all([
            this.request("package_list", { limit: 1 }),
            this.request("resource_search", { query: "*:*", limit: 1 }),
            this.request("organization_list", { all_fields: false, limit: 1 }),
            this.request("group_list", { all_fields: false, limit: 1 }),
            this.request("tag_list", { all_fields: false, limit: 1 }),
        ]);
        return {
            package_count: Array.isArray(packages) ? packages.length : 0,
            resource_count: typeof resources === "object" &&
                resources !== null &&
                "count" in resources
                ? resources.count
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
    async downloadResource(url) {
        try {
            const response = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: this.config.timeout,
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            throw new DataSourceError(`Failed to download resource: ${error instanceof Error ? error.message : "Unknown error"}`, "CKAN");
        }
    }
    /**
     * Get resource view data (for DataStore enabled resources)
     */
    async getResourceView(resourceId) {
        return this.request("datastore_search", {
            resource_id: resourceId,
            limit: 100,
        });
    }
    /**
     * Check if API is available
     */
    async isAvailable() {
        try {
            await this.request("status_show", {}, false);
            return true;
        }
        catch {
            return false;
        }
    }
}
// Default CKAN client instance
export const defaultCKANClient = new CKANClient();
//# sourceMappingURL=ckan.js.map