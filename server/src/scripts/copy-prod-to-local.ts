import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { logger } from "../config/logger";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface SyncStats {
  collection: string;
  sourceCount: number;
  copiedCount: number;
  indexesCreated: number;
  durationMs: number;
  status: "SUCCESS" | "EMPTY" | "FAILED";
  error?: string;
}

const BATCH_SIZE = 1000;
const { MongoClient } = mongoose.mongo;

/**
 * Sanitizes MongoDB connection URIs to redact user credentials from logs.
 */
function sanitizeMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = "********";
    }
    return parsed.toString();
  } catch {
    return uri.replace(/:([^@/]+)@/, ":********@");
  }
}

/**
 * Ensures target database is not a remote production cluster to prevent accidental overwrites.
 */
function assertTargetSafety(sourceUri: string, targetUri: string): void {
  if (sourceUri === targetUri) {
    throw new Error(
      "Safety constraint violation: Source and target URIs are identical. Aborting to prevent data corruption."
    );
  }

  const isRemoteTarget =
    targetUri.includes("mongodb.net") ||
    targetUri.includes("sotrix-cluster") ||
    targetUri.includes("amazonaws.com") ||
    targetUri.includes("azure.com");

  if (isRemoteTarget) {
    throw new Error(
      `Safety constraint violation: Target URI (${sanitizeMongoUri(
        targetUri
      )}) appears to be a remote/production cluster. Refusing to overwrite remote target.`
    );
  }
}

/**
 * Synchronizes custom indexes from source to target collection.
 */
async function syncIndexes(sourceCol: any, targetCol: any): Promise<number> {
  let synced = 0;
  try {
    const indexes = await sourceCol.indexes();
    for (const idx of indexes) {
      if (idx.name === "_id_") {
        continue;
      }
      const { v, ns, ...indexOptions } = idx as any;
      try {
        await targetCol.createIndex(idx.key, indexOptions);
        synced++;
      } catch (indexErr) {
        logger.warn(
          { collection: sourceCol.collectionName, index: idx.name, err: indexErr },
          "Index creation skipped or already satisfied on target"
        );
      }
    }
  } catch (err) {
    logger.warn(
      { collection: sourceCol.collectionName, err },
      "Could not retrieve indexes from source collection"
    );
  }
  return synced;
}

/**
 * Streams and copies documents in memory-efficient batches.
 */
async function syncCollection(
  sourceCol: any,
  targetCol: any,
  batchSize: number = BATCH_SIZE
): Promise<{ copied: number; sourceCount: number }> {
  const sourceCount = await sourceCol.countDocuments();

  // Clear existing target collection data
  await targetCol.deleteMany({});

  if (sourceCount === 0) {
    return { copied: 0, sourceCount: 0 };
  }

  const cursor = sourceCol.find({}).batchSize(batchSize);
  let batch: any[] = [];
  let copied = 0;

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= batchSize) {
      await targetCol.insertMany(batch, { ordered: false });
      copied += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await targetCol.insertMany(batch, { ordered: false });
    copied += batch.length;
    batch = [];
  }

  return { copied, sourceCount };
}

/**
 * Main migration execution controller.
 */
async function executeDatabaseSync(): Promise<void> {
  const startTime = Date.now();
  const sourceUri = process.env.PROD_DATABASE_URL;
  const targetUri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sotrix_dev";

  if (!sourceUri) {
    logger.error("FATAL: PROD_DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  logger.info({ source: sanitizeMongoUri(sourceUri), target: sanitizeMongoUri(targetUri) }, "Starting database synchronization");

  try {
    assertTargetSafety(sourceUri, targetUri);
  } catch (err: any) {
    logger.error({ error: err.message }, "Safety check failed");
    process.exit(1);
  }

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  // Register signal listeners for clean shutdown
  const handleSignal = async () => {
    logger.warn("Process interruption received. Closing database clients...");
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
    process.exit(1);
  };
  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  try {
    await Promise.all([sourceClient.connect(), targetClient.connect()]);
    logger.info("Connected successfully to source and target databases.");

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();

    const collections = await sourceDb.listCollections().toArray();
    const filteredCollections = collections.filter(
      (c) => !c.name.startsWith("system.")
    );

    logger.info(
      { count: filteredCollections.length, database: sourceDb.databaseName },
      "Identified collections for replication"
    );

    const summaryReport: SyncStats[] = [];

    for (const { name: colName } of filteredCollections) {
      const colStart = Date.now();
      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      try {
        const { copied, sourceCount } = await syncCollection(
          sourceCol,
          targetCol,
          BATCH_SIZE
        );
        const indexesCreated = await syncIndexes(sourceCol, targetCol);

        const durationMs = Date.now() - colStart;
        const status: SyncStats["status"] = copied > 0 ? "SUCCESS" : "EMPTY";

        summaryReport.push({
          collection: colName,
          sourceCount,
          copiedCount: copied,
          indexesCreated,
          durationMs,
          status,
        });

        logger.info(
          { collection: colName, sourceCount, copied, indexesCreated, durationMs },
          `Replicated collection [${colName}]`
        );
      } catch (colErr: any) {
        const durationMs = Date.now() - colStart;
        logger.error(
          { collection: colName, error: colErr.message, durationMs },
          `Failed to replicate collection [${colName}]`
        );

        summaryReport.push({
          collection: colName,
          sourceCount: 0,
          copiedCount: 0,
          indexesCreated: 0,
          durationMs,
          status: "FAILED",
          error: colErr.message,
        });
      }
    }

    const totalDurationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalCopied = summaryReport.reduce((acc, curr) => acc + curr.copiedCount, 0);

    console.log("\n=======================================================");
    console.log("            DATABASE REPLICATION SUMMARY");
    console.log("=======================================================");
    console.table(
      summaryReport.map((s) => ({
        Collection: s.collection,
        Source: s.sourceCount,
        Replicated: s.copiedCount,
        Indexes: s.indexesCreated,
        Time: `${s.durationMs}ms`,
        Status: s.status,
      }))
    );
    console.log("-------------------------------------------------------");
    console.log(`Total Documents Replicated: ${totalCopied}`);
    console.log(`Total Execution Time:       ${totalDurationSeconds}s`);
    console.log("=======================================================\n");

    const failedCount = summaryReport.filter((s) => s.status === "FAILED").length;
    if (failedCount > 0) {
      logger.warn({ failedCollections: failedCount }, "Synchronization completed with errors.");
      process.exit(1);
    } else {
      logger.info("Database synchronization completed successfully.");
    }
  } catch (error: any) {
    logger.error({ error: error.message }, "Database synchronization encountered an unhandled exception.");
    process.exit(1);
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

executeDatabaseSync();
