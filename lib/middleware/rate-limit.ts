// Rate limiting middleware
import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): NextResponse | null => {
    const ip = getClientIP(request);
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
      return null; // Allow request
    }

    if (entry.count >= config.max) {
      // Rate limit exceeded
      const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              config.message || "Too many requests, please try again later.",
            retryAfter: resetTimeSeconds,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.max.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": entry.resetTime.toString(),
            "Retry-After": resetTimeSeconds.toString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    return null; // Allow request
  };
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: "Too many API requests, please try again later.",
  },

  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: "Too many authentication attempts, please try again later.",
  },

  // Sales transactions (moderate)
  sales: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests per 5 minutes
    message: "Too many sales requests, please slow down.",
  },

  // Analytics (less restrictive for dashboards)
  analytics: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: "Too many analytics requests, please wait a moment.",
  },

  // File uploads (very restrictive)
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: "Upload limit exceeded, please try again later.",
  },
};

/**
 * Apply rate limiting to API routes
 */
export function withRateLimit(
  configName: keyof typeof rateLimitConfigs,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const rateLimitResponse = rateLimit(rateLimitConfigs[configName])(request);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request);
  };
}

/**
 * Get rate limit status for a client
 */
export function getRateLimitStatus(
  request: NextRequest,
  configName: keyof typeof rateLimitConfigs
) {
  const ip = getClientIP(request);
  const key = `${ip}:${request.nextUrl.pathname}`;
  const entry = rateLimitStore.get(key);
  const config = rateLimitConfigs[configName];

  if (!entry) {
    return {
      limit: config.max,
      remaining: config.max,
      reset: Date.now() + config.windowMs,
    };
  }

  return {
    limit: config.max,
    remaining: Math.max(0, config.max - entry.count),
    reset: entry.resetTime,
  };
}
