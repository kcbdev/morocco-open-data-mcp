/**
 * Morocco Open Data MCP - HDX Client
 * Client for Humanitarian Data Exchange (HDX) API
 * Documentation: https://data.humdata.org/api/3
 */
import { Cache } from '../lib/cache.js';
import { RateLimiter } from '../lib/rateLimiter.js';
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
        items: Array<{
            count: number;
            display_name: string;
            name: string;
        }>;
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
export declare class HDXClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    private readonly moroccoLocations;
    constructor(config?: HDXConfig);
    private handleError;
    private request;
    /**
     * Search for datasets
     */
    searchDatasets(query: string, options?: {
        fq?: string;
        sort?: string;
        rows?: number;
        start?: number;
        facet?: boolean;
        facet_fields?: string[];
        include_private?: boolean;
    }): Promise<HDXSearchResult>;
    /**
     * Search datasets specifically for Morocco
     */
    searchMoroccoDatasets(query: string, options?: {
        rows?: number;
        sort?: string;
    }): Promise<HDXSearchResult>;
    /**
     * Get a specific dataset by ID or name
     */
    getDataset(id: string, includeResources?: boolean): Promise<HDXDataset>;
    /**
     * List all datasets (with pagination)
     */
    listDatasets(options?: {
        limit?: number;
        offset?: number;
        all_fields?: boolean;
    }): Promise<string[] | HDXDataset[]>;
    /**
     * Get recently changed datasets
     */
    recentlyChangedDatasets(sinceDate?: string): Promise<{
        offset: number;
        packages: string[];
    }>;
    /**
     * Get a specific resource by ID
     */
    getResource(id: string): Promise<HDXResource>;
    /**
     * Search for resources
     */
    searchResources(query: string, options?: {
        package_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        count: number;
        results: HDXResource[];
    }>;
    /**
     * Get organization details
     */
    getOrganization(id: string): Promise<HDXOrganization>;
    /**
     * List all organizations
     */
    listOrganizations(options?: {
        all_fields?: boolean;
        limit?: number;
    }): Promise<HDXOrganization[]>;
    /**
     * Get group details
     */
    getGroup(id: string): Promise<HDXGroup>;
    /**
     * List all groups
     */
    listGroups(options?: {
        all_fields?: boolean;
        limit?: number;
    }): Promise<HDXGroup[]>;
    /**
     * List all tags
     */
    listTags(options?: {
        vocabulary_id?: string;
        all_fields?: boolean;
        limit?: number;
    }): Promise<HDXTag[]>;
    /**
     * Get tag details
     */
    getTag(id: string): Promise<HDXTag>;
    /**
     * Get vocabulary (tag category)
     */
    getVocabulary(id: string): Promise<HDXVocabulary>;
    /**
     * List all vocabularies
     */
    listVocabularies(): Promise<HDXVocabulary[]>;
    /**
     * Search datasets by tag
     */
    searchByTag(tag: string): Promise<HDXSearchResult>;
    /**
     * Search datasets by organization
     */
    searchByOrganization(orgId: string): Promise<HDXSearchResult>;
    /**
     * Search datasets by group
     */
    searchByGroup(groupId: string): Promise<HDXSearchResult>;
    /**
     * Get dataset statistics
     */
    getDatasetStats(): Promise<{
        package_count: number;
        resource_count: number;
        organization_count: number;
        group_count: number;
        tag_count: number;
    }>;
    /**
     * Download resource data (for file resources)
     */
    downloadResource(url: string): Promise<Buffer>;
    /**
     * Get resource view data (for DataStore enabled resources)
     */
    getResourceView(resourceId: string): Promise<unknown>;
    /**
     * Get Morocco-specific humanitarian indicators
     */
    getMoroccoHumanitarianIndicators(): Promise<{
        datasets: HDXDataset[];
        totalDownloads: number;
        organizations: string[];
        lastUpdated: string;
    }>;
    /**
     * Get disaster/emergency data for Morocco
     */
    getMoroccoDisasterData(): Promise<HDXSearchResult>;
    /**
     * Get refugee/migration data for Morocco
     */
    getMoroccoMigrationData(): Promise<HDXSearchResult>;
    /**
     * Get health/humanitarian data for Morocco
     */
    getMoroccoHealthData(): Promise<HDXSearchResult>;
    /**
     * Get food security data for Morocco
     */
    getMoroccoFoodSecurityData(): Promise<HDXSearchResult>;
    /**
     * Get climate/hazard data for Morocco
     */
    getMoroccoClimateData(): Promise<HDXSearchResult>;
    /**
     * Get datasets by date range
     */
    getDatasetsByDateRange(startDate: string, endDate: string, options?: {
        rows?: number;
    }): Promise<HDXSearchResult>;
    /**
     * Get popular datasets (by download count)
     */
    getPopularDatasets(limit?: number): Promise<HDXDataset[]>;
    /**
     * Get Morocco popular datasets
     */
    getMoroccoPopularDatasets(limit?: number): Promise<HDXDataset[]>;
    /**
     * Check if HDX API is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get API status
     */
    getStatus(): Promise<{
        status: string;
        version: string;
        lastUpdate: string;
    }>;
}
export declare const defaultHDXClient: HDXClient;
//# sourceMappingURL=hdx.d.ts.map