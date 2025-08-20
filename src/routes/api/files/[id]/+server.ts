import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { getFileStream, getDecryptedFileStream } from "$lib/server/storage";

export const GET = async ({ params, url, locals }) => {
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  const fileId = params.id;
  const download = url.searchParams.get("download");
  const placeholder = url.searchParams.get("placeholder");

  if (!fileId) {
    error(400, "Missing file ID");
  }

  const [file] = await db
    .select({
      id: table.file.id,
      folderId: table.file.folderId,
      storageKey: table.file.storageKey,
      name: table.file.name,
      mimeType: table.file.mimeType,
      encryptedDek: table.file.encryptedDek,
    })
    .from(table.file)
    .where(
      and(
        eq(table.file.storageKey, fileId),
        eq(table.file.ownerId, locals.user.id)
      )
    );

  if (!file) {
    error(404, "File not found");
  }

  try {
    let fileStream: ReadableStream;

    if (file.encryptedDek) {
      if (!locals.umk) {
        error(401, "Session expired - please log in again");
      }

      fileStream = await getDecryptedFileStream(
        file.storageKey,
        file.encryptedDek,
        locals.umk
      );
    } else {
      fileStream = getFileStream(
        file.storageKey + (placeholder === "true" ? ".webp" : "")
      );
    }

    const encodedFilename = encodeURIComponent(file.name);
    const asciiFilename = file.name.replace(/[^\x20-\x7E]/g, "");

    let contentDisposition: string;
    if (download === "true") {
      contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
    } else {
      contentDisposition = `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": placeholder === "true" ? "image/webp" : file.mimeType,
      "Content-Disposition": contentDisposition,
    };

    if (file.mimeType === "application/pdf") {
      headers["X-Frame-Options"] = "SAMEORIGIN";
      headers["Content-Security-Policy"] = "frame-ancestors 'self'";
    }

    return new Response(fileStream, { headers });
  } catch (err) {
    console.error(err);
    error(404, "File not found");
  }
};
