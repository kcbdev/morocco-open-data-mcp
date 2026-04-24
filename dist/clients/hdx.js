/**
 * Morocco Open Data MCP - HDX Client
 * Client for Humanitarian Data Exchange (HDX) API
 * Documentation: https://data.humdata.org/api/3
 */
import axios from 'axios';
import { DataSourceError, NotFoundError, TimeoutError, } from '../lib/errors.js';
import { prepareForSearch } from '../lib/arabic.js';
export class HDXClient {
    client;
    config;
    cache;
    rateLimiter;
    // Morocco location codes for HDX
    moroccoLocations = ['MAR', 'Morocco', 'MA'];
    constructor(config = {}) {
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
        this.client.interceptors.response.use(response => response, error => this.handleError(error));
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.code === 'ECONNABORTED') {
                throw new TimeoutError('HDX request timeout', 'HDX');
            }
            if (axiosError.response?.status === 404) {
                throw new NotFoundError('Resource not found on HDX', 'HDX');
            }
            throw new DataSourceError(`HDX API error: ${axiosError.message}`, 'HDX', axiosError.response?.status || 502);
        }
        throw new DataSourceError(error instanceof Error ? error.message : 'Unknown HDX error', 'HDX');
    }
    async request(action, params, useCache = true, cacheTTL) {
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
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached.result;
            }
        }
        // Make request
        const response = await this.client.get(`/action/${action}`, { params });
        if (!response.data.success) {
            throw new DataSourceError(response.data.error?.message || 'HDX action failed', 'HDX');
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
    async searchDatasets(query, options = {}) {
        const normalizedQuery = prepareForSearch(query);
        // Add Morocco filter by default
        const locationFilter = options.fq
            ? `${options.fq} AND location:MAR`
            : 'location:MAR';
        return this.request('package_search', {
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
    async searchMoroccoDatasets(query, options = {}) {
        return this.searchDatasets(query, {
            fq: 'location:MAR',
            rows: options.rows || 20,
            sort: options.sort || 'metadata_modified desc',
        });
    }
    /**
     * Get a specific dataset by ID or name
     */
    async getDataset(id, includeResources = true) {
        return this.request('package_show', {
            id,
            include_datasets: includeResources,
        });
    }
    /**
     * List all datasets (with pagination)
     */
    async listDatasets(options = {}) {
        return this.request('package_list', {
            limit: options.limit || 100,
            offset: options.offset || 0,
            all_fields: options.all_fields || false,
        });
    }
    /**
     * Get recently changed datasets
     */
    async recentlyChangedDatasets(sinceDate) {
        return this.request('recently_changed_packages', {
            since_date: sinceDate,
        });
    }
    /**
     * Get a specific resource by ID
     */
    async getResource(id) {
        return this.request('resource_show', { id });
    }
    /**
     * Search for resources
     */
    async searchResources(query, options = {}) {
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
    async getOrganization(id) {
        return this.request('organization_show', { id });
    }
    /**
     * List all organizations
     */
    async listOrganizations(options = {}) {
        return this.request('organization_list', {
            all_fields: options.all_fields || true,
            limit: options.limit || 100,
        });
    }
    /**
     * Get group details
     */
    async getGroup(id) {
        return this.request('group_show', { id });
    }
    /**
     * List all groups
     */
    async listGroups(options = {}) {
        return this.request('group_list', {
            all_fields: options.all_fields || true,
            limit: options.limit || 100,
        });
    }
    /**
     * List all tags
     */
    async listTags(options = {}) {
        return this.request('tag_list', {
            vocabulary_id: options.vocabulary_id,
            all_fields: options.all_fields || true,
            limit: options.limit || 100,
        });
    }
    /**
     * Get tag details
     */
    async getTag(id) {
        return this.request('tag_show', { id });
    }
    /**
     * Get vocabulary (tag category)
     */
    async getVocabulary(id) {
        return this.request('vocabulary_show', { id });
    }
    /**
     * List all vocabularies
     */
    async listVocabularies() {
        return this.request('vocabulary_list', {});
    }
    /**
     * Search datasets by tag
     */
    async searchByTag(tag) {
        return this.searchDatasets('', {
            fq: `tags:${tag}`,
            rows: 50,
        });
    }
    /**
     * Search datasets by organization
     */
    async searchByOrganization(orgId) {
        return this.searchDatasets('', {
            fq: `organization:${orgId}`,
            rows: 50,
        });
    }
    /**
     * Search datasets by group
     */
    async searchByGroup(groupId) {
        return this.searchDatasets('', {
            fq: `groups:${groupId}`,
            rows: 50,
        });
    }
    /**
     * Get dataset statistics
     */
    async getDatasetStats() {
        const [packages, resources, organizations, groups, tags] = await Promise.all([
            this.request('package_list', { limit: 1 }),
            this.request('resource_search', { query: '*:*', limit: 1 }),
            this.request('organization_list', { all_fields: false, limit: 1 }),
            this.request('group_list', { all_fields: false, limit: 1 }),
            this.request('tag_list', { all_fields: false, limit: 1 }),
        ]);
        return {
            package_count: Array.isArray(packages) ? packages.length : 0,
            resource_count: typeof resources === 'object' && resources !== null && 'count' in resources ? resources.count : 0,
            organization_count: Array.isArray(organizations) ? organizations.length : 0,
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
                responseType: 'arraybuffer',
                timeout: this.config.timeout,
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            throw new DataSourceError(`Failed to download resource: ${error instanceof Error ? error.message : 'Unknown error'}`, 'HDX');
        }
    }
    /**
     * Get resource view data (for DataStore enabled resources)
     */
    async getResourceView(resourceId) {
        return this.request('datastore_search', {
            resource_id: resourceId,
            limit: 100,
        });
    }
    /**
     * Get Morocco-specific humanitarian indicators
     */
    async getMoroccoHumanitarianIndicators() {
        const searchResult = await this.searchMoroccoDatasets('', { rows: 50 });
        const totalDownloads = searchResult.results.reduce((sum, dataset) => sum + (dataset.total_res_downloads || 0), 0);
        const organizations = Array.from(new Set(searchResult.results.map(d => d.organization?.title).filter(Boolean)));
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
    async getMoroccoDisasterData() {
        return this.searchMoroccoDatasets('disaster OR emergency OR crisis', {
            rows: 20,
        });
    }
    /**
     * Get refugee/migration data for Morocco
     */
    async getMoroccoMigrationData() {
        return this.searchMoroccoDatasets('refugee OR migration OR displacement', {
            rows: 20,
        });
    }
    /**
     * Get health/humanitarian data for Morocco
     */
    async getMoroccoHealthData() {
        return this.searchMoroccoDatasets('health OR epidemic OR vaccination', {
            rows: 20,
        });
    }
    /**
     * Get food security data for Morocco
     */
    async getMoroccoFoodSecurityData() {
        return this.searchMoroccoDatasets('food security OR nutrition OR famine', {
            rows: 20,
        });
    }
    /**
     * Get climate/hazard data for Morocco
     */
    async getMoroccoClimateData() {
        return this.searchMoroccoDatasets('climate OR drought OR flood OR hazard', {
            rows: 20,
        });
    }
    /**
     * Get datasets by date range
     */
    async getDatasetsByDateRange(startDate, endDate, options = {}) {
        return this.searchDatasets('', {
            fq: `metadata_created:[${startDate} TO ${endDate}]`,
            rows: options.rows || 50,
        });
    }
    /**
     * Get popular datasets (by download count)
     */
    async getPopularDatasets(limit = 10) {
        const result = await this.searchDatasets('', {
            sort: 'total_res_downloads desc',
            rows: limit,
        });
        return result.results;
    }
    /**
     * Get Morocco popular datasets
     */
    async getMoroccoPopularDatasets(limit = 10) {
        const result = await this.searchMoroccoDatasets('', {
            sort: 'total_res_downloads desc',
            rows: limit,
        });
        return result.results;
    }
    /**
     * Check if HDX API is available
     */
    async isAvailable() {
        try {
            await this.request('status_show', {}, false);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get API status
     */
    async getStatus() {
        return this.request('status_show', {}, false);
    }
}
// Default HDX client instance
export const defaultHDXClient = new HDXClient();
//# sourceMappingURL=hdx.js.map