/**
 * Morocco Open Data MCP - Error Handling Module
 * Custom error classes for standardized error handling across all data sources
 */
export declare class MCPError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly source?: string;
    readonly timestamp: Date;
    constructor(message: string, code?: string, statusCode?: number, source?: string);
    toJSON(): Record<string, unknown>;
}
export declare class DataSourceError extends MCPError {
    constructor(message: string, source?: string, statusCode?: number);
}
export declare class AuthenticationError extends MCPError {
    constructor(message?: string, source?: string);
}
export declare class RateLimitError extends MCPError {
    readonly retryAfter?: number;
    constructor(message?: string, retryAfter?: number);
    toJSON(): Record<string, unknown>;
}
export declare class ValidationError extends MCPError {
    readonly field?: string;
    readonly value?: unknown;
    constructor(message: string, field?: string, value?: unknown);
    toJSON(): Record<string, unknown>;
}
export declare class NotFoundError extends MCPError {
    constructor(message?: string, source?: string);
}
export declare class TimeoutError extends MCPError {
    constructor(message?: string, source?: string);
}
export declare class CacheError extends MCPError {
    constructor(message: string);
}
export declare class ConfigurationError extends MCPError {
    constructor(message: string);
}
export declare class ParseError extends MCPError {
    readonly rawData?: unknown;
    constructor(message: string, rawData?: unknown);
    toJSON(): Record<string, unknown>;
}
/**
 * Type guard for MCPError instances
 */
export declare function isMCPError(error: unknown): error is MCPError;
/**
 * Convert any error to MCPError with context
 */
export declare function toMCPError(error: unknown, context?: {
    source?: string;
    message?: string;
}): MCPError;
/**
 * Error codes registry for all data sources
 */
export declare const ErrorCodes: {
    readonly SUCCESS: "SUCCESS";
    readonly UNKNOWN: "UNKNOWN";
    readonly BAM: "BAM";
    readonly CKAN: "CKAN";
    readonly WORLD_BANK: "WORLD_BANK";
    readonly BVC: "BVC";
    readonly GEO: "GEO";
    readonly HDX: "HDX";
    readonly WEATHER: "WEATHER";
    readonly PRAYER: "PRAYER";
    readonly ACLED: "ACLED";
    readonly NETWORK: "NETWORK";
    readonly TIMEOUT: "TIMEOUT";
    readonly PARSE: "PARSE";
    readonly VALIDATION: "VALIDATION";
    readonly AUTH: "AUTH";
    readonly RATE_LIMIT: "RATE_LIMIT";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly SERVER: "SERVER";
    readonly CACHE: "CACHE";
    readonly CONFIG: "CONFIG";
};
//# sourceMappingURL=errors.d.ts.map