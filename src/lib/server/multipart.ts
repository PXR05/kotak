import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const STORAGE_PATH = path.resolve(process.cwd(), "storage");

interface MultipartFile {
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  relativePath?: string;
}

interface ParsedMultipart {
  files: MultipartFile[];
  fields: Map<string, string[]>;
}

export async function parseMultipartStream(
  request: Request,
  onFileStart?: (filename: string, storageKey: string) => void,
  onFileProgress?: (storageKey: string, bytesReceived: number) => void,
  onFileComplete?: (file: MultipartFile) => void
): Promise<ParsedMultipart> {
  const boundary = extractBoundary(request.headers.get("content-type"));
  if (!boundary) {
    throw new Error("No boundary found in Content-Type header");
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error("No request body");
  }

  await mkdir(STORAGE_PATH, { recursive: true });

  const files: MultipartFile[] = [];
  const fields = new Map<string, string[]>();

  let buffer = new Uint8Array(new ArrayBuffer(0));
  const boundaryBytes = new TextEncoder().encode(`--${boundary}`);
  const endBoundaryBytes = new TextEncoder().encode(`--${boundary}--`);

  let currentFile: {
    filename: string;
    mimeType: string;
    storageKey: string;
    writeStream: any;
    size: number;
    relativePath?: string;
  } | null = null;

  let currentField: {
    name: string;
    value: Uint8Array;
  } | null = null;

  let state: "boundary" | "headers" | "data" = "boundary";
  let headerBuffer = "";
  let finished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new Uint8Array(new ArrayBuffer(value.length));
      chunk.set(value);
      buffer = concatUint8Arrays(buffer, chunk as any) as any;

      while (buffer.length > 0) {
        if (state === "boundary") {
          while (buffer.length >= 2 && buffer[0] === 13 && buffer[1] === 10) {
            buffer = buffer.slice(2);
          }

          if (buffer.length < boundaryBytes.length) break;

          const startsWithEnd = startsWith(buffer, endBoundaryBytes);
          if (startsWithEnd) {
            buffer = buffer.slice(endBoundaryBytes.length);
            finished = true;
            break;
          }

          const startsWithBoundary = startsWith(buffer, boundaryBytes);
          if (startsWithBoundary) {
            buffer = buffer.slice(boundaryBytes.length);
            if (buffer.length >= 2 && buffer[0] === 13 && buffer[1] === 10) {
              buffer = buffer.slice(2); // skip \r\n
            }
            state = "headers";
            headerBuffer = "";
            continue;
          }

          const boundaryIndex = indexOfSequence(buffer, boundaryBytes, 0);
          if (boundaryIndex === -1) {
            break;
          } else {
            buffer = buffer.slice(boundaryIndex);
            continue;
          }
        } else if (state === "headers") {
          const headerEndIndex = findHeaderEnd(buffer);
          if (headerEndIndex === -1) break;

          const headerBytes = buffer.slice(0, headerEndIndex);
          headerBuffer += new TextDecoder().decode(headerBytes);
          buffer = buffer.slice(headerEndIndex + 4); // skip \r\n\r\n

          const headers = parseHeaders(headerBuffer);
          const disposition = headers.get("content-disposition");

          if (disposition?.includes("filename=")) {
            const filename = extractFilename(disposition);
            const name = extractFieldName(disposition);
            const mimeType =
              headers.get("content-type") || "application/octet-stream";
            const providedKey = fields.get("storageKey")?.[0];
            const storageKey = providedKey || randomUUID();

            const filePath = path.join(STORAGE_PATH, storageKey);
            const writeStream = createWriteStream(filePath, {
              highWaterMark: 64 * 1024,
              flags: "w",
            });

            currentFile = {
              filename,
              mimeType,
              storageKey,
              writeStream,
              size: 0,
              relativePath: name === "relativePaths" ? filename : undefined,
            };

            onFileStart?.(filename, storageKey);
          } else if (disposition) {
            const name = extractFieldName(disposition);
            currentField = {
              name,
              value: new Uint8Array(new ArrayBuffer(0)),
            };
          }

          state = "data";
        } else if (state === "data") {
          const nextBoundaryIndex = indexOfSequence(buffer, boundaryBytes, 0);

          if (nextBoundaryIndex === -1) {
            if (currentFile) {
              currentFile.writeStream.write(Buffer.from(buffer));
              currentFile.size += buffer.length;
              onFileProgress?.(currentFile.storageKey, currentFile.size);
            } else if (currentField) {
              currentField.value = concatUint8Arrays(
                currentField.value,
                buffer
              );
            }
            buffer = buffer.subarray(0, 0);
          } else {
            let dataEnd = nextBoundaryIndex;
            if (
              dataEnd >= 2 &&
              buffer[dataEnd - 2] === 13 &&
              buffer[dataEnd - 1] === 10
            ) {
              // remove trailing \r\n
              dataEnd -= 2;
            }

            const data = buffer.slice(0, dataEnd);

            if (currentFile) {
              currentFile.writeStream.write(Buffer.from(data));
              currentFile.size += data.length;
              currentFile.writeStream.end();

              const file: MultipartFile = {
                filename: currentFile.filename,
                mimeType: currentFile.mimeType,
                size: currentFile.size,
                storageKey: currentFile.storageKey,
                relativePath: currentFile.relativePath,
              };

              files.push(file);
              onFileComplete?.(file);
              currentFile = null;
            } else if (currentField) {
              currentField.value = concatUint8Arrays(currentField.value, data);
              const fieldValue = new TextDecoder().decode(currentField.value);

              if (!fields.has(currentField.name)) {
                fields.set(currentField.name, []);
              }
              fields.get(currentField.name)!.push(fieldValue);
              currentField = null;
            }

            buffer = buffer.slice(nextBoundaryIndex);
            state = "boundary";
          }
        }
        if (finished) break;
      }
      if (finished) break;
    }
  } finally {
    if (currentFile?.writeStream) {
      currentFile.writeStream.end();
    }
  }

  return { files, fields };
}

function extractBoundary(contentType: string | null): string | null {
  if (!contentType) return null;
  const match = contentType.match(/boundary=([^;]+)/);
  return match ? match[1].replace(/"/g, "") : null;
}

function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const totalLength = a.length + b.length;
  const result = new Uint8Array(new ArrayBuffer(totalLength));
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

function indexOfSequence(
  buffer: Uint8Array,
  seq: Uint8Array,
  from = 0
): number {
  if (seq.length === 0) return -1;
  const max = buffer.length - seq.length;
  for (let i = from; i <= max; i++) {
    let j = 0;
    for (; j < seq.length; j++) {
      if (buffer[i + j] !== seq[j]) break;
    }
    if (j === seq.length) return i;
  }
  return -1;
}

function startsWith(buffer: Uint8Array, seq: Uint8Array): boolean {
  if (buffer.length < seq.length) return false;
  for (let i = 0; i < seq.length; i++) {
    if (buffer[i] !== seq[i]) return false;
  }
  return true;
}

function findHeaderEnd(buffer: Uint8Array): number {
  if (buffer.length < 4) return -1;

  const maxIndex = buffer.length - 4;
  for (let i = 0; i <= maxIndex; i++) {
    if (
      buffer[i] === 13 &&
      buffer[i + 1] === 10 &&
      buffer[i + 2] === 13 &&
      buffer[i + 3] === 10
    ) {
      return i;
    }
  }
  return -1;
}

function parseHeaders(headerString: string): Map<string, string> {
  const headers = new Map<string, string>();

  const lines = headerString.split("\r\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const name = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers.set(name, value);
    }
  }

  return headers;
}

const FILENAME_REGEX = /filename="([^"]+)"/;
const FIELDNAME_REGEX = /name="([^"]+)"/;

function extractFilename(disposition: string): string {
  const match = disposition.match(FILENAME_REGEX);
  return match ? match[1] : "unknown";
}

function extractFieldName(disposition: string): string {
  const match = disposition.match(FIELDNAME_REGEX);
  return match ? match[1] : "unknown";
}
