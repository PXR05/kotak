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

const STORAGE_PATH = path.resolve(process.cwd(), "storage");

mkdir(STORAGE_PATH, { recursive: true }).catch((e) => {
  console.error("Failed to create storage directory on startup.", e);
});

/**
 * Creates a file in the storage.
 * @param file The file to store. This should be a File object from a FormData.
 * @returns Metadata of the stored file.
 */
export async function createFile(file: File) {
  const storageKey = randomUUID();
  const filePath = path.join(STORAGE_PATH, storageKey);

  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return {
    storageKey,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    name: file.name,
  };
}

/**
 * Gets a readable stream for a file from storage.
 * This is useful for streaming file contents in a response.
 * @param storageKey The key of the file in storage.
 * @returns A web ReadableStream of the file content.
 */
export function getFileStream(storageKey: string): ReadableStream {
  const filePath = path.join(STORAGE_PATH, storageKey);
  const fileStream = createReadStream(filePath);
  return Readable.toWeb(fileStream) as ReadableStream;
}

/**
 * Deletes a file from storage.
 * It will not throw an error if the file does not exist.
 * @param storageKey The key of the file in storage.
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
 * @param userId The ID of the user to calculate storage usage for.
 * @returns An object containing total and free space in bytes, plus used space by the user.
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
 * @param sourceStorageKey The storage key of the source file to copy.
 * @returns The storage key of the copied file.
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
