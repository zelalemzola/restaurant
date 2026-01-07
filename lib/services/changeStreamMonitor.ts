import { MongoClient, ChangeStream, ChangeStreamDocument } from "mongodb";
import { eventBroadcaster } from "./eventBroadcaster";

interface ChangeStreamConfig {
  database: string;
  collections: string[];
  onConnect?: () => void;
  onError?: (error: Error) => void;
}

class ChangeStreamMonitor {
  private client: MongoClient | null = null;
  private changeStreams: Map<string, ChangeStream> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(private config: ChangeStreamConfig) {}

  async connect() {
    try {
      if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is not set");
      }

      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();

      console.log("Connected to MongoDB for change stream monitoring");
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Set up change streams for each collection
      await this.setupChangeStreams();

      if (this.config.onConnect) {
        this.config.onConnect();
      }
    } catch (error) {
      console.error("Failed to connect to MongoDB for change streams:", error);
      this.handleConnectionError(error as Error);
    }
  }

  private async setupChangeStreams() {
    if (!this.client || !this.isConnected) {
      throw new Error("MongoDB client is not connected");
    }

    const db = this.client.db(this.config.database);

    for (const collectionName of this.config.collections) {
      try {
        const collection = db.collection(collectionName);

        // Create change stream with options
        const changeStream = collection.watch([], {
          fullDocument: "updateLookup",
          fullDocumentBeforeChange: "whenAvailable",
        });

        // Handle change events
        changeStream.on("change", (change: ChangeStreamDocument) => {
          this.handleChangeEvent(collectionName, change);
        });

        changeStream.on("error", (error: Error) => {
          console.error(`Change stream error for ${collectionName}:`, error);
          this.handleStreamError(collectionName, error);
        });

        changeStream.on("close", () => {
          console.log(`Change stream closed for ${collectionName}`);
          this.changeStreams.delete(collectionName);
        });

        this.changeStreams.set(collectionName, changeStream);
        console.log(`Change stream established for ${collectionName}`);
      } catch (error) {
        console.error(
          `Failed to set up change stream for ${collectionName}:`,
          error
        );
      }
    }
  }

  private handleChangeEvent(
    collectionName: string,
    change: ChangeStreamDocument
  ) {
    try {
      const { operationType } = change;
      const fullDocument = (change as any).fullDocument; // Type assertion for fullDocument
      const documentKey = (change as any).documentKey; // Type assertion for documentKey

      // Map collection names to entity types
      const entityTypeMap: Record<string, string> = {
        products: "product",
        inventory: "inventory",
        costoperations: "cost",
        saletransactions: "sale",
        notifications: "notification",
      };

      const entityType = entityTypeMap[collectionName];
      if (!entityType) {
        console.warn(`Unknown collection for change stream: ${collectionName}`);
        return;
      }

      // Handle different operation types
      switch (operationType) {
        case "insert":
          if (fullDocument) {
            this.broadcastChange(entityType, "create", fullDocument);
          }
          break;

        case "update":
          if (fullDocument) {
            this.broadcastChange(entityType, "update", fullDocument);
          }
          break;

        case "delete":
          if (documentKey) {
            this.broadcastChange(entityType, "delete", {
              id: documentKey._id,
              _id: documentKey._id,
            });
          }
          break;

        case "replace":
          if (fullDocument) {
            this.broadcastChange(entityType, "update", fullDocument);
          }
          break;

        default:
          console.log(`Unhandled operation type: ${operationType}`);
      }
    } catch (error) {
      console.error("Error handling change event:", error);
    }
  }

  private broadcastChange(entityType: string, operation: string, data: any) {
    // Add version/timestamp for conflict resolution
    const changeData = {
      ...data,
      _changeTimestamp: Date.now(),
      _changeVersion: this.generateVersion(),
    };

    // Broadcast the change using our event broadcaster
    eventBroadcaster.broadcast({
      entity: entityType as any,
      operation: operation as any,
      data: changeData,
      timestamp: Date.now(),
    });
  }

  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleStreamError(collectionName: string, error: Error) {
    console.error(`Change stream error for ${collectionName}:`, error);

    // Remove the failed stream
    const stream = this.changeStreams.get(collectionName);
    if (stream) {
      stream.close();
      this.changeStreams.delete(collectionName);
    }

    // Attempt to reconnect the specific stream
    setTimeout(() => {
      this.reconnectStream(collectionName);
    }, this.reconnectDelay);
  }

  private async reconnectStream(collectionName: string) {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      const db = this.client.db(this.config.database);
      const collection = db.collection(collectionName);

      const changeStream = collection.watch([], {
        fullDocument: "updateLookup",
        fullDocumentBeforeChange: "whenAvailable",
      });

      changeStream.on("change", (change: ChangeStreamDocument) => {
        this.handleChangeEvent(collectionName, change);
      });

      changeStream.on("error", (error: Error) => {
        this.handleStreamError(collectionName, error);
      });

      this.changeStreams.set(collectionName, changeStream);
      console.log(`Reconnected change stream for ${collectionName}`);
    } catch (error) {
      console.error(
        `Failed to reconnect change stream for ${collectionName}:`,
        error
      );
    }
  }

  private handleConnectionError(error: Error) {
    this.isConnected = false;

    if (this.config.onError) {
      this.config.onError(error);
    }

    // Attempt to reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(
        "Max reconnection attempts reached. Change stream monitoring disabled."
      );
    }
  }

  async disconnect() {
    // Close all change streams
    for (const [collectionName, stream] of this.changeStreams) {
      try {
        await stream.close();
        console.log(`Closed change stream for ${collectionName}`);
      } catch (error) {
        console.error(
          `Error closing change stream for ${collectionName}:`,
          error
        );
      }
    }

    this.changeStreams.clear();

    // Close MongoDB connection
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log("Disconnected from MongoDB change stream monitoring");
    }

    this.isConnected = false;
  }

  isMonitoring(): boolean {
    return this.isConnected && this.changeStreams.size > 0;
  }

  getActiveStreams(): string[] {
    return Array.from(this.changeStreams.keys());
  }
}

// Create and export the monitor instance
export const changeStreamMonitor = new ChangeStreamMonitor({
  database: "restaurant-erp",
  collections: [
    "products",
    "inventory",
    "costoperations",
    "saletransactions",
    "notifications",
  ],
  onConnect: () => {
    console.log("Change stream monitoring is now active");
  },
  onError: (error) => {
    console.error("Change stream monitoring error:", error);
  },
});

// Initialize change stream monitoring (call this in your app startup)
export async function initializeChangeStreamMonitoring() {
  try {
    await changeStreamMonitor.connect();
  } catch (error) {
    console.error("Failed to initialize change stream monitoring:", error);
  }
}

// Cleanup function (call this on app shutdown)
export async function cleanupChangeStreamMonitoring() {
  try {
    await changeStreamMonitor.disconnect();
  } catch (error) {
    console.error("Error during change stream cleanup:", error);
  }
}
