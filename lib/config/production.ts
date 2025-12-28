// Production configuration and environment validation
import { z } from "zod";

// Environment variable schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url("Invalid MongoDB URI"),

  // Authentication
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "Auth secret must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("Invalid auth URL"),

  // API Configuration
  API_RATE_LIMIT: z
    .string()
    .default("100")
    .transform((val) => parseInt(val, 10)),
  API_TIMEOUT: z
    .string()
    .default("30000")
    .transform((val) => parseInt(val, 10)),

  // Cache
  REDIS_URL: z.string().optional(),
  CACHE_TTL_DEFAULT: z
    .string()
    .default("300")
    .transform((val) => parseInt(val, 10)),

  // Monitoring
  ENABLE_ERROR_MONITORING: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("error"),
  SENTRY_DSN: z.string().optional(),

  // Performance
  ENABLE_COMPRESSION: z
    .string()
    .default("true")
    .transform((val) => val === "true"),
  ENABLE_STATIC_OPTIMIZATION: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // File Upload
  MAX_FILE_SIZE: z
    .string()
    .default("10485760")
    .transform((val) => parseInt(val, 10)),
  ALLOWED_FILE_TYPES: z.string().default("image/jpeg,image/png,image/webp"),

  // Feature Flags
  ENABLE_ANALYTICS: z
    .string()
    .default("true")
    .transform((val) => val === "true"),
  ENABLE_AUDIT_LOGS: z
    .string()
    .default("true")
    .transform((val) => val === "true"),
  ENABLE_NOTIFICATIONS: z
    .string()
    .default("true")
    .transform((val) => val === "true"),
});

// Validate environment variables
export function validateEnvironment() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("Environment validation failed:", error);
    throw new Error("Invalid environment configuration");
  }
}

// Production configuration
export const productionConfig = {
  // Database settings
  database: {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },

  // API settings
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    timeout: 30000,
    compression: true,
  },

  // Cache settings
  cache: {
    defaultTTL: 300, // 5 minutes
    maxSize: 1000, // max cache entries
    checkPeriod: 600, // check for expired entries every 10 minutes
  },

  // Security settings
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
    cors: {
      origin: process.env.BETTER_AUTH_URL,
      credentials: true,
    },
  },

  // Monitoring settings
  monitoring: {
    errorReporting: true,
    performanceTracking: true,
    healthChecks: {
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
    },
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || "error",
    format: "json",
    maxFiles: 5,
    maxSize: "10m",
  },
};

// Health check configuration
export const healthChecks = {
  database: async () => {
    // Check database connection
    try {
      const mongoose = await import("mongoose");
      return mongoose.connection.readyState === 1;
    } catch {
      return false;
    }
  },

  cache: async () => {
    // Check cache availability
    try {
      // If using Redis, check Redis connection
      // For now, just return true for in-memory cache
      return true;
    } catch {
      return false;
    }
  },

  external: async () => {
    // Check external service dependencies
    try {
      // Add checks for external APIs if any
      return true;
    } catch {
      return false;
    }
  },
};

// Performance thresholds
export const performanceThresholds = {
  apiResponse: 1000, // 1 second
  databaseQuery: 500, // 500ms
  cacheHit: 10, // 10ms
  memoryUsage: 0.8, // 80% of available memory
  cpuUsage: 0.8, // 80% CPU usage
};

// Feature flags
export const featureFlags = {
  analytics: process.env.ENABLE_ANALYTICS === "true",
  auditLogs: process.env.ENABLE_AUDIT_LOGS === "true",
  notifications: process.env.ENABLE_NOTIFICATIONS === "true",
  caching: true,
  compression: process.env.ENABLE_COMPRESSION === "true",
  errorMonitoring: process.env.ENABLE_ERROR_MONITORING === "true",
};
