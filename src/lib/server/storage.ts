import { mkdir, writeFile, unlink } from "node:fs/promises";
import { createReadStream, statfs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { db } from "./db/index.js";
import { file } from "./db/schema.js";
import { eq, sum } from "drizzle-orm";
import lqipModern from "lqip-modern";
import { CryptoUtils } from "./crypto.js";

const STORAGE_PATH = path.resolve(process.cwd(), "storage");

mkdir(STORAGE_PATH, { recursive: true }).catch((e) => {
  console.error("Failed to create storage directory on startup.", e);
});

export async function createFile(
  storageKey: string,
  filename: string,
  mimeType: string,
  fileData: Buffer,
  umk?: string
): Promise<{
  storageKey: string;
  size: number;
  mimeType: string;
  name: string;
  encryptedDek?: string;
}> {
  const filePath = path.join(STORAGE_PATH, storageKey);

  let encryptedDek: string | undefined;
  let finalFileData = fileData;

  if (umk) {
    const dek = CryptoUtils.generateDEK();

    const encryptionResult = CryptoUtils.encryptBuffer(fileData, dek);
    encryptedDek = CryptoUtils.encryptDEK(dek, umk);

    const encryptedFileBuffer = Buffer.concat([
      encryptionResult.iv,
      encryptionResult.tag,
      encryptionResult.encrypted,
    ]);

    finalFileData = encryptedFileBuffer;
  }

  await writeFile(filePath, finalFileData);

  if (mimeType.startsWith("image/") && !umk) {
    try {
      const placeholder = await lqipModern(filePath, {
        outputFormat: "webp",
        resize: 32,
      });
      const placeholderFilePath = path.join(STORAGE_PATH, `${storageKey}.webp`);
      await writeFile(placeholderFilePath, placeholder.content);
    } catch (error) {
      console.warn("Failed to generate image placeholder:", error);
    }
  }

  return {
    storageKey,
    size: finalFileData.length,
    mimeType: mimeType || "application/octet-stream",
    name: filename,
    encryptedDek,
  };
}

export function getFileStream(storageKey: string): ReadableStream {
  const filePath = path.join(STORAGE_PATH, storageKey);
  const fileStream = createReadStream(filePath);
  return Readable.toWeb(fileStream) as ReadableStream;
}

export async function getDecryptedFileStream(
  storageKey: string,
  encryptedDek: string,
  umk: string
): Promise<ReadableStream> {
  const filePath = path.join(STORAGE_PATH, storageKey);
  const encryptedData = await import("node:fs/promises").then((fs) =>
    fs.readFile(filePath)
  );

  const dek = CryptoUtils.decryptDEK(encryptedDek, umk);

  const ivLength = 16;
  const tagLength = 16;

  const iv = encryptedData.subarray(0, ivLength);
  const tag = encryptedData.subarray(ivLength, ivLength + tagLength);
  const encrypted = encryptedData.subarray(ivLength + tagLength);

  const decryptedData = CryptoUtils.decryptBuffer(encrypted, iv, tag, dek);

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(decryptedData);
      controller.close();
    },
  });

  return readable;
}

export async function getDecryptedFileStreamWithDEK(
  storageKey: string,
  dek: string
): Promise<ReadableStream> {
  const filePath = path.join(STORAGE_PATH, storageKey);
  const encryptedData = await import("node:fs/promises").then((fs) =>
    fs.readFile(filePath)
  );

  const ivLength = 16;
  const tagLength = 16;

  const iv = encryptedData.subarray(0, ivLength);
  const tag = encryptedData.subarray(ivLength, ivLength + tagLength);
  const encrypted = encryptedData.subarray(ivLength + tagLength);

  const decryptedData = CryptoUtils.decryptBuffer(encrypted, iv, tag, dek);

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(decryptedData);
      controller.close();
    },
  });

  return readable;
}

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
