// API response caching utilities
import { NextResponse } from "next/server";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// In-memory cache for development (use Redis in production)
const cache = new Map<string, CacheEntry>();

/**
 * Cache configuration for different endpoints
 */
export const CACHE_CONFIG = {
  // Dashboard data - cache for 1 minute
  dashboard: { ttl: 60 * 1000 },

  // Product groups - cache for 5 minutes (rarely change)
  productGroups: { ttl: 5 * 60 * 1000 },

  // Analytics data - cache for 2 minutes
  analytics: { ttl: 2 * 60 * 1000 },

  // Stock levels - cache for 30 seconds (frequently updated)
  stockLevels: { ttl: 30 * 1000 },

  // Notifications - cache for 15 seconds
  notifications: { ttl: 15 * 1000 },
} as const;

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(
  endpoint: string,
  params?: Record<string, any>
): string {
  const baseKey = `api:${endpoint}`;
  if (!params) return baseKey;

  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join("|");

  return `${baseKey}:${sortedParams}`;
}

/**
 * Get cached response
 */
export function getCachedResponse(key: string): any | null {
  const entry = cache.get(key);

  if (!entry) return null;

  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cached response
 */
export function setCachedResponse(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Clear cache entries by pattern
 */
export function clearCachePattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Cache middleware for API routes
 */
export function withCache(
  endpoint: keyof typeof CACHE_CONFIG,
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const cacheKey = generateCacheKey(endpoint, params);

    // Try to get cached response
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          "X-Cache": "HIT",
          "Cache-Control": `public, max-age=${Math.floor(
            CACHE_CONFIG[endpoint].ttl / 1000
          )}`,
        },
      });
    }

    // Execute handler and cache response
    const response = await handler(request);

    if (response.ok) {
      const responseData = await response.json();
      setCachedResponse(cacheKey, responseData, CACHE_CONFIG[endpoint].ttl);

      return NextResponse.json(responseData, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": `public, max-age=${Math.floor(
            CACHE_CONFIG[endpoint].ttl / 1000
          )}`,
        },
      });
    }

    return response;
  };
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  // Invalidate product-related caches when products change
  products: () => {
    clearCachePattern("products");
    clearCachePattern("dashboard");
    clearCachePattern("stockLevels");
    clearCachePattern("analytics");
  },

  // Invalidate sales-related caches when sales are recorded
  sales: () => {
    clearCachePattern("dashboard");
    clearCachePattern("analytics");
    clearCachePattern("stockLevels");
  },

  // Invalidate cost-related caches when costs are added/updated
  costs: () => {
    clearCachePattern("analytics");
    clearCachePattern("dashboard");
  },

  // Invalidate notification caches
  notifications: () => {
    clearCachePattern("notifications");
    clearCachePattern("dashboard");
  },
};

/**
 * Cache statistics for monitoring
 */
export function getCacheStats() {
  const stats = {
    totalEntries: cache.size,
    hitRate: 0,
    entries: [] as Array<{ key: string; age: number; ttl: number }>,
  };

  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    stats.entries.push({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    });
  }

  return stats;
}
