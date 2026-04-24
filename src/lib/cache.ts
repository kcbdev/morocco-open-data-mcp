/**
 * Morocco Open Data MCP - Cache Module
 * In-memory caching with TTL support for API responses
 */

import NodeCache from "node-cache";
import { CacheError } from "./errors.js";

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

export class Cache {
  private cache: NodeCache;
  private readonly prefix: string;

  constructor(prefix: string = "mcp", options: CacheOptions = {}) {
    const {
      stdTTL = parseInt(process.env.CACHE_TTL_DEFAULT || "3600"),
      checkperiod = 600,
      maxKeys = -1,
      useClones = true,
    } = options;

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

  private makeKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const fullKey = this.makeKey(key);
    const value = this.cache.get<T>(fullKey);

    if (value === undefined) {
      console.log(`[Cache] MISS: ${fullKey}`);
      return undefined;
    }

    console.log(`[Cache] HIT: ${fullKey}`);
    return value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const fullKey = this.makeKey(key);

    try {
      const success =
        ttl !== undefined
          ? this.cache.set(fullKey, value, ttl)
          : this.cache.set(fullKey, value);
      console.log(`[Cache] SET: ${fullKey} (ttl: ${ttl || "default"})`);
      return success;
    } catch (error) {
      throw new CacheError(
        `Failed to set cache key ${fullKey}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async del(key: string): Promise<boolean> {
    const fullKey = this.makeKey(key);
    const deleted = this.cache.del(fullKey);
    console.log(`[Cache] DEL: ${fullKey}`);
    return deleted > 0;
  }

  async has(key: string): Promise<boolean> {
    const fullKey = this.makeKey(key);
    return this.cache.has(fullKey);
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T | undefined>> {
    const result = new Map<string, T | undefined>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      result.set(key, value);
    }

    return result;
  }

  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<boolean> {
    let success = true;

    for (const [key, value] of entries.entries()) {
      const setResult = await this.set(key, value, ttl);
      if (!setResult) {
        success = false;
      }
    }

    return success;
  }

  async flush(): Promise<void> {
    this.cache.flushAll();
    console.log("[Cache] Flushed all keys");
  }

  async flushPrefix(): Promise<void> {
    const keys = this.cache.keys();
    const prefixToDel = `${this.prefix}:`;

    for (const key of keys) {
      if (key.startsWith(prefixToDel)) {
        this.cache.del(key);
      }
    }

    console.log(`[Cache] Flushed all keys with prefix: ${prefixToDel}`);
  }

  getStats(): CacheStats {
    const stats = this.cache.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      ksize: stats.ksize,
      vsize: stats.vsize,
    };
  }

  async ttl(key: string): Promise<number | undefined> {
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
