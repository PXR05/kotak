import { mkdir, writeFile, unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

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
