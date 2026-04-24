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

export class RateLimiter {
  private readonly limits: Map<string, RateLimitConfig>;
  private readonly state: Map<string, RateLimitState>;
  private readonly defaultLimit: RateLimitConfig;

  constructor(defaultLimit: RateLimitConfig = { requestsPerMinute: 60, burstSize: 10 }) {
    this.limits = new Map();
    this.state = new Map();
    this.defaultLimit = defaultLimit;
  }

  /**
   * Register a rate limit for a specific endpoint or source
   */
  registerLimit(key: string, config: RateLimitConfig): void {
    this.limits.set(key, config);
    console.log(`[RateLimiter] Registered limit for ${key}: ${config.requestsPerMinute} req/min`);
  }

  /**
   * Get the rate limit config for a key
   */
  private getConfig(key: string): RateLimitConfig {
    return this.limits.get(key) || this.defaultLimit;
  }

  /**
   * Get or initialize state for a key
   */
  private getState(key: string): RateLimitState {
    const existing = this.state.get(key);
    const now = Date.now();

    if (!existing || now >= existing.resetTime) {
      const config = this.getConfig(key);
      const newState: RateLimitState = {
        count: 0,
        resetTime: now + 60000, // Reset after 1 minute
        lastRequest: 0,
      };
      this.state.set(key, newState);
      return newState;
    }

    return existing;
  }

  /**
   * Check if a request is allowed under the rate limit
   * Returns true if allowed, false if rate limited
   */
  async checkLimit(key: string): Promise<boolean> {
    const config = this.getConfig(key);
    const state = this.getState(key);
    const now = Date.now();

    // Reset if window has passed
    if (now >= state.resetTime) {
      state.count = 0;
      state.resetTime = now + 60000;
    }

    // Check burst limit (requests per second)
    if (config.burstSize) {
      const oneSecondAgo = now - 1000;
      if (state.lastRequest > oneSecondAgo && state.count >= config.burstSize) {
        console.log(`[RateLimiter] Burst limit exceeded for ${key}`);
        return false;
      }
    }

    // Check rate limit
    if (state.count >= config.requestsPerMinute) {
      console.log(`[RateLimiter] Rate limit exceeded for ${key}: ${state.count}/${config.requestsPerMinute}`);
      return false;
    }

    return true;
  }

  /**
   * Record a request and return remaining quota
   */
  async recordRequest(key: string): Promise<{ remaining: number; resetTime: number }> {
    const config = this.getConfig(key);
    const state = this.getState(key);

    state.count++;
    state.lastRequest = Date.now();

    const remaining = Math.max(0, config.requestsPerMinute - state.count);
    const resetTime = state.resetTime;

    this.state.set(key, state);

    console.log(`[RateLimiter] Request recorded for ${key}: ${state.count}/${config.requestsPerMinute}`);

    return {
      remaining,
      resetTime,
    };
  }

  /**
   * Wait until the rate limit resets
   */
  async waitForReset(key: string): Promise<void> {
    const state = this.getState(key);
    const now = Date.now();

    if (now < state.resetTime) {
      const waitTime = state.resetTime - now;
      console.log(`[RateLimiter] Waiting ${waitTime}ms for ${key} rate limit reset`);
      await this.sleep(waitTime);
    }
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(key: string): {
    limit: number;
    remaining: number;
    resetTime: number;
    isLimited: boolean;
  } {
    const config = this.getConfig(key);
    const state = this.getState(key);
    const now = Date.now();

    // Reset if window has passed
    if (now >= state.resetTime) {
      return {
        limit: config.requestsPerMinute,
        remaining: config.requestsPerMinute,
        resetTime: now + 60000,
        isLimited: false,
      };
    }

    return {
      limit: config.requestsPerMinute,
      remaining: Math.max(0, config.requestsPerMinute - state.count),
      resetTime: state.resetTime,
      isLimited: state.count >= config.requestsPerMinute,
    };
  }

  /**
   * Reset rate limit state for a key
   */
  reset(key: string): void {
    this.state.delete(key);
    console.log(`[RateLimiter] Reset state for ${key}`);
  }

  /**
   * Reset all rate limit state
   */
  resetAll(): void {
    this.state.clear();
    console.log('[RateLimiter] Reset all state');
  }

  /**
   * Get all current rate limit statuses
   */
  getAllStatuses(): Map<string, ReturnType<RateLimiter['getStatus']>> {
    const statuses = new Map<string, ReturnType<RateLimiter['getStatus']>>();

    for (const key of this.limits.keys()) {
      statuses.set(key, this.getStatus(key));
    }

    return statuses;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Default rate limiter instance with standard limits
 */
export const defaultRateLimiter = new RateLimiter({
  requestsPerMinute: 60,
  burstSize: 10,
});

/**
 * Rate limit configurations for known data sources
 */
export const SourceRateLimits = {
  BAM: { requestsPerMinute: 30, burstSize: 5 },      // Bank Al-Maghrib
  CKAN: { requestsPerMinute: 60, burstSize: 10 },    // data.gov.ma
  WORLD_BANK: { requestsPerMinute: 60, burstSize: 10 },
  BVC: { requestsPerMinute: 30, burstSize: 5 },      // Casablanca Stock Exchange
  GEO: { requestsPerMinute: 100, burstSize: 20 },    // Geographic data
  PRAYER: { requestsPerMinute: 120, burstSize: 30 }, // Prayer times (high frequency)
  HDX: { requestsPerMinute: 60, burstSize: 10 },     // Humanitarian Data Exchange
  WEATHER: { requestsPerMinute: 60, burstSize: 10 },
  ACLED: { requestsPerMinute: 30, burstSize: 5 },    // Conflict data
} as const;

/**
 * Initialize rate limiter with source-specific limits
 */
export function initializeRateLimiter(limiter: RateLimiter = defaultRateLimiter): void {
  for (const [source, config] of Object.entries(SourceRateLimits)) {
    limiter.registerLimit(source.toLowerCase(), config);
  }
}
