/**
 * Morocco Open Data MCP - Cache Module
 * In-memory caching with TTL support for API responses
 */
import NodeCache from "node-cache";
import { CacheError } from "./errors.js";
export class Cache {
    cache;
    prefix;
    constructor(prefix = "mcp", options = {}) {
        const { stdTTL = parseInt(process.env.CACHE_TTL_DEFAULT || "3600"), checkperiod = 600, maxKeys = -1, useClones = true, } = options;
        this.prefix = prefix;
        this.cache = new NodeCache({
            stdTTL,
            checkperiod,
            maxKeys,
            useClones,
            deleteOnExpire: true,
        });
        this.cache.on("expired", (key) => {
            console.log(`[Cache] Key expired: ${key}`);
        });
        this.cache.on("del", (key) => {
            console.log(`[Cache] Key deleted: ${key}`);
        });
    }
    makeKey(key) {
        return `${this.prefix}:${key}`;
    }
    async get(key) {
        const fullKey = this.makeKey(key);
        const value = this.cache.get(fullKey);
        if (value === undefined) {
            console.log(`[Cache] MISS: ${fullKey}`);
            return undefined;
        }
        console.log(`[Cache] HIT: ${fullKey}`);
        return value;
    }
    async set(key, value, ttl) {
        const fullKey = this.makeKey(key);
        try {
            const success = ttl !== undefined
                ? this.cache.set(fullKey, value, ttl)
                : this.cache.set(fullKey, value);
            console.log(`[Cache] SET: ${fullKey} (ttl: ${ttl || "default"})`);
            return success;
        }
        catch (error) {
            throw new CacheError(`Failed to set cache key ${fullKey}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async del(key) {
        const fullKey = this.makeKey(key);
        const deleted = this.cache.del(fullKey);
        console.log(`[Cache] DEL: ${fullKey}`);
        return deleted > 0;
    }
    async has(key) {
        const fullKey = this.makeKey(key);
        return this.cache.has(fullKey);
    }
    async getOrSet(key, fetchFn, ttl) {
        const cached = await this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const value = await fetchFn();
        await this.set(key, value, ttl);
        return value;
    }
    async mget(keys) {
        const result = new Map();
        for (const key of keys) {
            const value = await this.get(key);
            result.set(key, value);
        }
        return result;
    }
    async mset(entries, ttl) {
        let success = true;
        for (const [key, value] of entries.entries()) {
            const setResult = await this.set(key, value, ttl);
            if (!setResult) {
                success = false;
            }
        }
        return success;
    }
    async flush() {
        this.cache.flushAll();
        console.log("[Cache] Flushed all keys");
    }
    async flushPrefix() {
        const keys = this.cache.keys();
        const prefixToDel = `${this.prefix}:`;
        for (const key of keys) {
            if (key.startsWith(prefixToDel)) {
                this.cache.del(key);
            }
        }
        console.log(`[Cache] Flushed all keys with prefix: ${prefixToDel}`);
    }
    getStats() {
        const stats = this.cache.getStats();
        return {
            hits: stats.hits,
            misses: stats.misses,
            keys: stats.keys,
            ksize: stats.ksize,
            vsize: stats.vsize,
        };
    }
    async ttl(key) {
        const fullKey = this.makeKey(key);
        return this.cache.getTtl(fullKey);
    }
}
// Default cache instance for general use
export const defaultCache = new Cache("mcp");
// Short-term cache for frequently changing data (5 minutes)
export const shortTermCache = new Cache("mcp:short", { stdTTL: 300 });
// Long-term cache for static data (24 hours)
export const longTermCache = new Cache("mcp:long", { stdTTL: 86400 });
//# sourceMappingURL=cache.js.map