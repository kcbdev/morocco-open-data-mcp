/**
 * Morocco Open Data MCP - Cache Module
 * In-memory caching with TTL support for API responses
 */
export interface CacheOptions {
    stdTTL?: number;
    checkperiod?: number;
    maxKeys?: number;
    useClones?: boolean;
}
export interface CacheStats {
    hits: number;
    misses: number;
    keys: number;
    ksize: number;
    vsize: number;
}
export declare class Cache {
    private cache;
    private readonly prefix;
    constructor(prefix?: string, options?: CacheOptions);
    private makeKey;
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    has(key: string): Promise<boolean>;
    getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T>;
    mget<T>(keys: string[]): Promise<Map<string, T | undefined>>;
    mset<T>(entries: Map<string, T>, ttl?: number): Promise<boolean>;
    flush(): Promise<void>;
    flushPrefix(): Promise<void>;
    getStats(): CacheStats;
    ttl(key: string): Promise<number | undefined>;
}
export declare const defaultCache: Cache;
export declare const shortTermCache: Cache;
export declare const longTermCache: Cache;
//# sourceMappingURL=cache.d.ts.map