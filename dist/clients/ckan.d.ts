/**
 * Morocco Open Data MCP - CKAN Client
 * Client for data.gov.ma CKAN API - Morocco's national open data portal
 * Documentation: https://data.gov.ma/data/api/3
 */
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
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
    extras?: Array<{
        key: string;
        value: string;
    }>;
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
        items: Array<{
            count: number;
            display_name: string;
            name: string;
        }>;
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
export declare class CKANClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    constructor(config?: CKANConfig);
    private handleError;
    private request;
    /**
     * Search for datasets/packages
     */
    searchPackages(query: string, options?: {
        fq?: string;
        sort?: string;
        rows?: number;
        start?: number;
        facet?: boolean;
        facet_fields?: string[];
    }): Promise<CKANSearchResult>;
    /**
     * Get a specific package by ID or name
     */
    getPackage(id: string, includeResources?: boolean): Promise<CKANPackage>;
    /**
     * List all packages (with pagination)
     */
    listPackages(options?: {
        limit?: number;
        offset?: number;
        all_fields?: boolean;
    }): Promise<string[] | CKANPackage[]>;
    /**
     * Get recently changed packages
     */
    recentlyChangedPackages(sinceDate?: string): Promise<{
        offset: number;
        packages: string[];
    }>;
    /**
     * Get a specific resource by ID
     */
    getResource(id: string): Promise<CKANResource>;
    /**
     * Search for resources
     */
    searchResources(query: string, options?: {
        package_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        count: number;
        results: CKANResource[];
    }>;
    /**
     * Get organization details
     */
    getOrganization(id: string): Promise<CKANOrganization>;
    /**
     * List all organizations
     */
    listOrganizations(options?: {
        all_fields?: boolean;
        limit?: number;
    }): Promise<CKANOrganization[]>;
    /**
     * Get group details
     */
    getGroup(id: string): Promise<CKANGroup>;
    /**
     * List all groups
     */
    listGroups(options?: {
        all_fields?: boolean;
        limit?: number;
    }): Promise<CKANGroup[]>;
    /**
     * List all tags
     */
    listTags(options?: {
        vocabulary_id?: string;
        all_fields?: boolean;
        limit?: number;
    }): Promise<CKANTag[]>;
    /**
     * Get tag details
     */
    getTag(id: string): Promise<CKANTag>;
    /**
     * Search packages by tag
     */
    searchByTag(tag: string): Promise<CKANSearchResult>;
    /**
     * Search packages by organization
     */
    searchByOrganization(orgId: string): Promise<CKANSearchResult>;
    /**
     * Search packages by group
     */
    searchByGroup(groupId: string): Promise<CKANSearchResult>;
    /**
     * Get package statistics
     */
    getPackageStats(): Promise<{
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
     * Check if API is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const defaultCKANClient: CKANClient;
//# sourceMappingURL=ckan.d.ts.map