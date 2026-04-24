/**
 * Morocco Open Data MCP - Rate Limiter Module
 * Prevents API abuse by limiting request frequency per endpoint
 */
export interface RateLimitConfig {
    requestsPerMinute: number;
    burstSize?: number;
}
export interface RateLimitState {
    count: number;
    resetTime: number;
    lastRequest: number;
}
export declare class RateLimiter {
    private readonly limits;
    private readonly state;
    private readonly defaultLimit;
    constructor(defaultLimit?: RateLimitConfig);
    /**
     * Register a rate limit for a specific endpoint or source
     */
    registerLimit(key: string, config: RateLimitConfig): void;
    /**
     * Get the rate limit config for a key
     */
    private getConfig;
    /**
     * Get or initialize state for a key
     */
    private getState;
    /**
     * Check if a request is allowed under the rate limit
     * Returns true if allowed, false if rate limited
     */
    checkLimit(key: string): Promise<boolean>;
    /**
     * Record a request and return remaining quota
     */
    recordRequest(key: string): Promise<{
        remaining: number;
        resetTime: number;
    }>;
    /**
     * Wait until the rate limit resets
     */
    waitForReset(key: string): Promise<void>;
    /**
     * Get current rate limit status for a key
     */
    getStatus(key: string): {
        limit: number;
        remaining: number;
        resetTime: number;
        isLimited: boolean;
    };
    /**
     * Reset rate limit state for a key
     */
    reset(key: string): void;
    /**
     * Reset all rate limit state
     */
    resetAll(): void;
    /**
     * Get all current rate limit statuses
     */
    getAllStatuses(): Map<string, ReturnType<RateLimiter['getStatus']>>;
    /**
     * Sleep utility function
     */
    private sleep;
}
/**
 * Default rate limiter instance with standard limits
 */
export declare const defaultRateLimiter: RateLimiter;
/**
 * Rate limit configurations for known data sources
 */
export declare const SourceRateLimits: {
    readonly BAM: {
        readonly requestsPerMinute: 30;
        readonly burstSize: 5;
    };
    readonly CKAN: {
        readonly requestsPerMinute: 60;
        readonly burstSize: 10;
    };
    readonly WORLD_BANK: {
        readonly requestsPerMinute: 60;
        readonly burstSize: 10;
    };
    readonly BVC: {
        readonly requestsPerMinute: 30;
        readonly burstSize: 5;
    };
    readonly GEO: {
        readonly requestsPerMinute: 100;
        readonly burstSize: 20;
    };
    readonly PRAYER: {
        readonly requestsPerMinute: 120;
        readonly burstSize: 30;
    };
    readonly HDX: {
        readonly requestsPerMinute: 60;
        readonly burstSize: 10;
    };
    readonly WEATHER: {
        readonly requestsPerMinute: 60;
        readonly burstSize: 10;
    };
    readonly ACLED: {
        readonly requestsPerMinute: 30;
        readonly burstSize: 5;
    };
};
/**
 * Initialize rate limiter with source-specific limits
 */
export declare function initializeRateLimiter(limiter?: RateLimiter): void;
//# sourceMappingURL=rateLimiter.d.ts.map