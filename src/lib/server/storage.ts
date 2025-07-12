import {
  mkdir,
  writeFile,
  unlink,
  copyFile as fsCopyFile,
} from "node:fs/promises";
import { createReadStream, statfs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { db } from "./db/index.js";
import { file } from "./db/schema.js";
import { eq, sum } from "drizzle-orm";
import lqipModern from "lqip-modern";

const STORAGE_PATH = path.resolve(process.cwd(), "storage");

mkdir(STORAGE_PATH, { recursive: true }).catch((e) => {
  console.error("Failed to create storage directory on startup.", e);
});

/**
 * Creates a file in the storage.
 */
export async function createFile(file: File) {
  const storageKey = randomUUID();
  const filePath = path.join(STORAGE_PATH, storageKey);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const placeholder = await lqipModern(filePath, {
    outputFormat: "webp",
    resize: 32,
  });
  const placeholderFilePath = path.join(STORAGE_PATH, `${storageKey}.webp`);
  await writeFile(placeholderFilePath, placeholder.content);

  return {
    storageKey,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    name: file.name,
  };
}

/**
 * Gets a readable stream for a file from storage.
 * This is for streaming file contents in a response.
 */
export function getFileStream(storageKey: string): ReadableStream {
  const filePath = path.join(STORAGE_PATH, storageKey);
  const fileStream = createReadStream(filePath);
  return Readable.toWeb(fileStream) as ReadableStream;
}

/**
 * Deletes a file from storage.
 * It will not throw an error if the file does not exist.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const filePath = path.join(STORAGE_PATH, storageKey);
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

/**
 * Gets the server's storage status.
 */
export async function getStorageStatus(userId?: string): Promise<{
  total: number;
  free: number;
  used: number;
}> {
  if (!userId) {
    throw new Error("User ID is required to get storage status");
  }

  const diskStats = await new Promise<{ total: number; free: number }>(
    (resolve, reject) => {
      statfs(STORAGE_PATH, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        const total = stats.blocks * stats.bsize;
        const free = stats.bavail * stats.bsize;

        resolve({ total, free });
      });
    }
  );

  const userStorageResult = await db
    .select({ totalSize: sum(file.size) })
    .from(file)
    .where(eq(file.ownerId, userId));

  const used = userStorageResult[0]?.totalSize || 0;

  return {
    total: diskStats.total,
    free: diskStats.free,
    used: Number(used),
  };
}

/**
 * Copies a file in storage and returns the new storage key.
 */
export async function copyFile(sourceStorageKey: string): Promise<string> {
  const newStorageKey = randomUUID();
  const sourcePath = path.join(STORAGE_PATH, sourceStorageKey);
  const destPath = path.join(STORAGE_PATH, newStorageKey);

  try {
    await fsCopyFile(sourcePath, destPath);
    return newStorageKey;
  } catch (error) {
    console.error("Failed to copy file:", error);
    throw new Error("Failed to copy file in storage");
  }
}
