// Production configuration for deployment
export const productionConfig = {
  // Vercel deployment settings
  vercel: {
    // Environment variables that should be set in Vercel dashboard
    requiredEnvVars: [
      "MONGODB_URI",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "NEXT_PUBLIC_APP_URL",
    ],

    // Recommended Vercel settings
    settings: {
      nodeVersion: "18.x",
      buildCommand: "npm run build",
      outputDirectory: ".next",
      installCommand: "npm ci",
    },
  },

  // Authentication settings for production
  auth: {
    // Session cookie settings for production
    cookieSettings: {
      secure: true, // HTTPS only in production
      sameSite: "lax" as const,
      httpOnly: true,
      domain: process.env.NODE_ENV === "production" ? ".vercel.app" : undefined,
    },

    // CORS settings
    corsOrigins: [
      process.env.BETTER_AUTH_URL || "https://restaurant-lime-nu-21.vercel.app",
      process.env.NEXT_PUBLIC_APP_URL ||
        "https://restaurant-lime-nu-21.vercel.app",
    ],
  },

  // Database settings
  database: {
    // MongoDB connection settings for production
    options: {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    },
  },
};

// Helper function to validate environment variables
export function validateProductionEnv() {
  const missing = productionConfig.vercel.requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please set these in your Vercel dashboard under Settings > Environment Variables"
    );
  }

  return true;
}

// Helper function to get the correct base URL
export function getBaseURL() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return "http://localhost:3000";
}

// Helper function to check if we're in production
export function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}
