// API response caching utilities
import { NextResponse } from "next/server";

// In-memory cache for development (use Redis in production)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
}

// Cache response helper
export function withCache<T>(
  handler: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, key, tags = [] } = options; // Default 5 minutes TTL

  return new Promise(async (resolve, reject) => {
    try {
      const cacheKey = key || generateCacheKey(handler.toString());
      const cached = cache.get(cacheKey);

      // Return cached data if valid
      if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
        resolve(cached.data);
        return;
      }

      // Execute handler and cache result
      const result = await handler();
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl,
      });

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// Generate cache key from function or custom string
function generateCacheKey(input: string): string {
  // Simple hash function for cache key generation
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `cache_${Math.abs(hash)}`;
}

// Cache invalidation
export function invalidateCache(pattern?: string | RegExp) {
  if (!pattern) {
    cache.clear();
    return;
  }

  const keys = Array.from(cache.keys());
  keys.forEach((key) => {
    if (typeof pattern === "string" && key.includes(pattern)) {
      cache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      cache.delete(key);
    }
  });
}

// Cache middleware for API routes
export function cacheResponse(
  response: any,
  options: CacheOptions = {}
): NextResponse {
  const { ttl = 300 } = options;

  const res = NextResponse.json(response);

  // Set cache headers
  res.headers.set(
    "Cache-Control",
    `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`
  );

  return res;
}

// Specific cache configurations for different endpoints
export const CacheConfigs = {
  // Dashboard data - cache for 2 minutes
  dashboard: { ttl: 120, tags: ["dashboard"] },

  // Product data - cache for 5 minutes
  products: { ttl: 300, tags: ["products"] },

  // Stock levels - cache for 1 minute (more dynamic)
  stockLevels: { ttl: 60, tags: ["stock"] },

  // Analytics - cache for 10 minutes
  analytics: { ttl: 600, tags: ["analytics"] },

  // Notifications - cache for 30 seconds
  notifications: { ttl: 30, tags: ["notifications"] },

  // Static data - cache for 1 hour
  static: { ttl: 3600, tags: ["static"] },
};

// Cache warming functions
export const CacheWarming = {
  // Warm up dashboard cache
  async warmDashboard() {
    // This would typically make requests to dashboard endpoints
    // to populate the cache before users access them
    console.log("Warming dashboard cache...");
  },

  // Warm up product cache
  async warmProducts() {
    console.log("Warming products cache...");
  },
};

// Cache statistics
export function getCacheStats() {
  const stats = {
    totalKeys: cache.size,
    memoryUsage: 0,
    hitRate: 0, // Would need to track hits/misses
    keys: Array.from(cache.keys()),
  };

  // Calculate approximate memory usage
  cache.forEach((value) => {
    stats.memoryUsage += JSON.stringify(value).length;
  });

  return stats;
}

// Cleanup expired cache entries
export function cleanupExpiredCache() {
  const now = Date.now();
  cache.forEach((value, key) => {
    if (now - value.timestamp > value.ttl * 1000) {
      cache.delete(key);
    }
  });
}

// Auto cleanup every 5 minutes
if (typeof window === "undefined") {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
