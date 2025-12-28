// MongoDB connection utility
import mongoose from "mongoose";
import { MongoClient, Db } from "mongodb";
import {
  initializeIndexes,
  optimizeConnectionPool,
} from "./utils/database-optimization";
import { logger } from "./utils/error-monitoring";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://zola:zola@cluster0.8oaktx9.mongodb.net/restaurant-erp";

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Connection state tracking
let isConnected = false;
let isInitialized = false;

// Mongoose connection with optimization
async function connectDB() {
  try {
    if (isConnected && mongoose.connection.readyState === 1) {
      return mongoose;
    }

    // Apply connection pool optimizations
    optimizeConnectionPool();

    const opts = {
      bufferCommands: false,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "10"),
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || "5"),
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME || "30000"),
      serverSelectionTimeoutMS: parseInt(
        process.env.DB_SERVER_SELECTION_TIMEOUT || "5000"
      ),
      socketTimeoutMS: 45000,
      // Enable connection monitoring
      monitorCommands: process.env.NODE_ENV === "development",
    };

    logger.info("Connecting to MongoDB...", {
      additionalData: {
        uri: MONGODB_URI.replace(/\/\/.*@/, "//***:***@"), // Hide credentials in logs
        options: opts,
      },
    });

    await mongoose.connect(MONGODB_URI, opts);
    isConnected = true;

    logger.info("MongoDB connected successfully");

    // Initialize indexes on first connection
    if (!isInitialized) {
      await initializeIndexes();
      isInitialized = true;
      logger.info("Database indexes initialized");
    }

    // Set up connection event listeners
    mongoose.connection.on("error", (error) => {
      logger.error("MongoDB connection error", error);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      isConnected = true;
    });

    return mongoose;
  } catch (error) {
    logger.error("MongoDB connection error", error as Error);
    isConnected = false;
    throw error;
  }
}

// MongoDB native client connection for BetterAuth
let client: MongoClient;
let db: Db;

export async function connectToDatabase() {
  if (db) {
    return { client, db };
  }

  try {
    logger.info("Connecting to MongoDB (native client)...");

    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "10"),
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || "5"),
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME || "30000"),
      serverSelectionTimeoutMS: parseInt(
        process.env.DB_SERVER_SELECTION_TIMEOUT || "5000"
      ),
    });

    await client.connect();
    db = client.db("restaurant-erp");

    logger.info("MongoDB native client connected successfully");

    return { client, db };
  } catch (error) {
    logger.error("MongoDB native connection error", error as Error);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down MongoDB connections...");

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info("Mongoose connection closed");
    }

    if (client) {
      await client.close();
      logger.info("MongoDB native client closed");
    }
  } catch (error) {
    logger.error("Error during MongoDB shutdown", error as Error);
  }

  process.exit(0);
});

export default connectDB;
