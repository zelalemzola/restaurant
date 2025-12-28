// Data backup and recovery utilities
import { connectToDatabase } from "@/lib/mongodb";
import { createAuditLog } from "./audit";
import { Readable } from "stream";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";

export interface BackupMetadata {
  timestamp: Date;
  version: string;
  collections: string[];
  totalDocuments: number;
  size: number;
  checksum: string;
}

export interface BackupOptions {
  collections?: string[];
  compress?: boolean;
  includeIndexes?: boolean;
}

/**
 * Create a backup of the database
 */
export async function createBackup(
  userId: string,
  userEmail: string,
  options: BackupOptions = {}
): Promise<{
  success: boolean;
  backupId: string;
  metadata: BackupMetadata;
  data?: Buffer;
  error?: string;
}> {
  try {
    const { db } = await connectToDatabase();

    const {
      collections = [
        "products",
        "productgroups",
        "stocktransactions",
        "salestransactions",
        "costoperations",
        "notifications",
        "users",
      ],
      compress = true,
      includeIndexes = false,
    } = options;

    const backupId = `backup_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const backupData: any = {
      metadata: {
        timestamp: new Date(),
        version: "1.0.0",
        collections,
        backupId,
        includeIndexes,
      },
      data: {},
    };

    let totalDocuments = 0;

    // Export each collection
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();

        backupData.data[collectionName] = {
          documents,
          count: documents.length,
        };

        // Include indexes if requested
        if (includeIndexes) {
          const indexes = await collection.indexes();
          backupData.data[collectionName].indexes = indexes;
        }

        totalDocuments += documents.length;
      } catch (error) {
        console.warn(`Failed to backup collection ${collectionName}:`, error);
        backupData.data[collectionName] = {
          documents: [],
          count: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Convert to JSON
    const jsonData = JSON.stringify(backupData, null, 2);
    let finalData = Buffer.from(jsonData, "utf8");

    // Compress if requested
    if (compress) {
      const compressed = await compressData(finalData);
      finalData = Buffer.from(compressed);
    }

    // Calculate checksum
    const crypto = await import("crypto");
    const checksum = crypto
      .createHash("sha256")
      .update(finalData)
      .digest("hex");

    const metadata: BackupMetadata = {
      timestamp: backupData.metadata.timestamp,
      version: backupData.metadata.version,
      collections,
      totalDocuments,
      size: finalData.length,
      checksum,
    };

    // Log the backup creation
    await createAuditLog({
      userId,
      userEmail,
      action: "BACKUP_CREATED",
      resource: "SYSTEM",
      resourceId: backupId,
      details: {
        collections,
        totalDocuments,
        size: finalData.length,
        compressed: compress,
        includeIndexes,
      },
    });

    return {
      success: true,
      backupId,
      metadata,
      data: finalData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Log the backup failure
    await createAuditLog({
      userId,
      userEmail,
      action: "BACKUP_CREATED",
      resource: "SYSTEM",
      details: {
        collections: options.collections || [],
        error: errorMessage,
      },
      success: false,
      errorMessage,
    });

    return {
      success: false,
      backupId: "",
      metadata: {} as BackupMetadata,
      error: errorMessage,
    };
  }
}

/**
 * Restore data from a backup
 */
export async function restoreBackup(
  userId: string,
  userEmail: string,
  backupData: Buffer,
  options: {
    validateChecksum?: boolean;
    overwriteExisting?: boolean;
    collections?: string[];
  } = {}
): Promise<{
  success: boolean;
  restoredCollections: string[];
  totalDocuments: number;
  error?: string;
}> {
  try {
    const { db } = await connectToDatabase();
    const {
      validateChecksum = true,
      overwriteExisting = false,
      collections: targetCollections,
    } = options;

    // Try to decompress if needed
    let jsonData: string;
    try {
      const decompressed = await decompressData(backupData);
      jsonData = decompressed.toString("utf8");
    } catch {
      // If decompression fails, assume it's not compressed
      jsonData = backupData.toString("utf8");
    }

    const backup = JSON.parse(jsonData);
    const { metadata, data } = backup;

    // Validate checksum if requested
    if (validateChecksum && metadata.checksum) {
      const crypto = await import("crypto");
      const calculatedChecksum = crypto
        .createHash("sha256")
        .update(backupData)
        .digest("hex");
      if (calculatedChecksum !== metadata.checksum) {
        throw new Error("Backup checksum validation failed");
      }
    }

    const restoredCollections: string[] = [];
    let totalDocuments = 0;

    // Restore each collection
    for (const [collectionName, collectionData] of Object.entries(data)) {
      if (targetCollections && !targetCollections.includes(collectionName)) {
        continue;
      }

      try {
        const collection = db.collection(collectionName);
        const { documents, indexes } = collectionData as any;

        if (!documents || !Array.isArray(documents)) {
          continue;
        }

        // Clear existing data if overwrite is enabled
        if (overwriteExisting) {
          await collection.deleteMany({});
        }

        // Insert documents
        if (documents.length > 0) {
          await collection.insertMany(documents);
          totalDocuments += documents.length;
        }

        // Restore indexes if available
        if (indexes && Array.isArray(indexes)) {
          for (const index of indexes) {
            try {
              if (index.name !== "_id_") {
                // Skip default _id index
                await collection.createIndex(index.key, {
                  name: index.name,
                  ...index,
                });
              }
            } catch (indexError) {
              console.warn(
                `Failed to restore index ${index.name}:`,
                indexError
              );
            }
          }
        }

        restoredCollections.push(collectionName);
      } catch (error) {
        console.error(`Failed to restore collection ${collectionName}:`, error);
      }
    }

    // Log the restore operation
    await createAuditLog({
      userId,
      userEmail,
      action: "SYSTEM",
      resource: "SYSTEM",
      details: {
        operation: "restore",
        restoredCollections,
        totalDocuments,
        backupTimestamp: metadata.timestamp,
        overwriteExisting,
      },
    });

    return {
      success: true,
      restoredCollections,
      totalDocuments,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Log the restore failure
    await createAuditLog({
      userId,
      userEmail,
      action: "SYSTEM",
      resource: "SYSTEM",
      details: {
        operation: "restore",
        error: errorMessage,
      },
      success: false,
      errorMessage,
    });

    return {
      success: false,
      restoredCollections: [],
      totalDocuments: 0,
      error: errorMessage,
    };
  }
}

/**
 * Compress data using gzip
 */
async function compressData(data: Buffer): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const readable = Readable.from([data]);
  const gzip = createGzip();

  await pipeline(readable, gzip);

  return new Promise((resolve, reject) => {
    gzip.on("data", (chunk) => chunks.push(chunk));
    gzip.on("end", () => resolve(Buffer.concat(chunks)));
    gzip.on("error", reject);
  });
}

/**
 * Decompress gzipped data
 */
async function decompressData(data: Buffer): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const readable = Readable.from([data]);
  const gunzip = createGunzip();

  await pipeline(readable, gunzip);

  return new Promise((resolve, reject) => {
    gunzip.on("data", (chunk) => chunks.push(chunk));
    gunzip.on("end", () => resolve(Buffer.concat(chunks)));
    gunzip.on("error", reject);
  });
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalCollections: number;
  totalDocuments: number;
  estimatedSize: number;
}> {
  try {
    const { db } = await connectToDatabase();

    const collections = await db.listCollections().toArray();
    let totalDocuments = 0;
    let estimatedSize = 0;

    for (const collection of collections) {
      try {
        const coll = db.collection(collection.name);
        const count = await coll.countDocuments();
        const stats = await db.command({ collStats: collection.name });

        totalDocuments += count;
        estimatedSize += stats.size || 0;
      } catch (error) {
        console.warn(
          `Failed to get stats for collection ${collection.name}:`,
          error
        );
      }
    }

    return {
      totalCollections: collections.length,
      totalDocuments,
      estimatedSize,
    };
  } catch (error) {
    console.error("Failed to get backup stats:", error);
    return {
      totalCollections: 0,
      totalDocuments: 0,
      estimatedSize: 0,
    };
  }
}
