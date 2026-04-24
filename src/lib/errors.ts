/**
 * Morocco Open Data MCP - Error Handling Module
 * Custom error classes for standardized error handling across all data sources
 */

export class MCPError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly source?: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'MCP_ERROR',
    statusCode: number = 500,
    source?: string
  ) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.statusCode = statusCode;
    this.source = source;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, MCPError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      source: this.source,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

export class DataSourceError extends MCPError {
  constructor(message: string, source?: string, statusCode: number = 502) {
    super(message, 'DATA_SOURCE_ERROR', statusCode, source);
    this.name = 'DataSourceError';
    Object.setPrototypeOf(this, DataSourceError.prototype);
  }
}

export class AuthenticationError extends MCPError {
  constructor(message: string = 'Authentication failed', source?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, source);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class RateLimitError extends MCPError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

export class ValidationError extends MCPError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
    };
  }
}

export class NotFoundError extends MCPError {
  constructor(message: string = 'Resource not found', source?: string) {
    super(message, 'NOT_FOUND_ERROR', 404, source);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class TimeoutError extends MCPError {
  constructor(message: string = 'Request timeout', source?: string) {
    super(message, 'TIMEOUT_ERROR', 504, source);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class CacheError extends MCPError {
  constructor(message: string) {
    super(message, 'CACHE_ERROR', 500);
    this.name = 'CacheError';
    Object.setPrototypeOf(this, CacheError.prototype);
  }
}

export class ConfigurationError extends MCPError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ParseError extends MCPError {
  public readonly rawData?: unknown;

  constructor(message: string, rawData?: unknown) {
    super(message, 'PARSE_ERROR', 502);
    this.name = 'ParseError';
    this.rawData = rawData;
    Object.setPrototypeOf(this, ParseError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      hasRawData: this.rawData !== undefined,
    };
  }
}

/**
 * Type guard for MCPError instances
 */
export function isMCPError(error: unknown): error is MCPError {
  return error instanceof MCPError;
}

/**
 * Convert any error to MCPError with context
 */
export function toMCPError(
  error: unknown,
  context?: { source?: string; message?: string }
): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    return new DataSourceError(
      context?.message || error.message,
      context?.source
    );
  }

  return new DataSourceError(
    context?.message || 'An unknown error occurred',
    context?.source
  );
}

/**
 * Error codes registry for all data sources
 */
export const ErrorCodes = {
  // General
  SUCCESS: 'SUCCESS',
  UNKNOWN: 'UNKNOWN',

  // Data Sources
  BAM: 'BAM',
  CKAN: 'CKAN',
  WORLD_BANK: 'WORLD_BANK',
  BVC: 'BVC',
  GEO: 'GEO',
  HDX: 'HDX',
  WEATHER: 'WEATHER',
  PRAYER: 'PRAYER',
  ACLED: 'ACLED',

  // Error Types
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  PARSE: 'PARSE',
  VALIDATION: 'VALIDATION',
  AUTH: 'AUTH',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  CACHE: 'CACHE',
  CONFIG: 'CONFIG',
} as const;
