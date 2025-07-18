import { error } from "@sveltejs/kit";
import { getFileStream } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

async function validateFileShare(shareId: string, userEmail?: string) {
  const [fileShare] = await db
    .select({
      share: table.fileShare,
      file: table.file,
      sharedBy: { id: table.user.id, email: table.user.email },
    })
    .from(table.fileShare)
    .innerJoin(table.file, eq(table.fileShare.fileId, table.file.id))
    .innerJoin(table.user, eq(table.fileShare.sharedBy, table.user.id))
    .where(eq(table.fileShare.id, shareId));

  if (!fileShare) return null;

  if (fileShare.share.expiresAt && new Date() > fileShare.share.expiresAt) {
    return null;
  }

  if (fileShare.share.isPublic) return fileShare;

  if (!userEmail) return null;

  const [recipient] = await db
    .select()
    .from(table.fileShareRecipient)
    .where(
      and(
        eq(table.fileShareRecipient.shareId, shareId),
        eq(table.fileShareRecipient.email, userEmail.toLowerCase())
      )
    );

  return recipient ? fileShare : null;
}

export const GET = async ({ params, url, locals }) => {
  const shareId = params.shareId;
  const download = url.searchParams.get("download");

  if (!shareId) {
    throw error(400, "Missing share ID");
  }

  const userEmail = locals.user?.email;
  const shareData = await validateFileShare(shareId, userEmail);

  if (!shareData) {
    throw error(404, "Shared file not found or access denied");
  }

  const { file } = shareData;

  try {
    const fileStream = getFileStream(file.storageKey);
    const encodedFilename = encodeURIComponent(file.name);
    const asciiFilename = file.name.replace(/[^\x20-\x7E]/g, "");

    const contentDisposition =
      download === "true"
        ? `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
        : `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;

    const headers: Record<string, string> = {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition,
    };

    if (file.mimeType === "application/pdf") {
      headers["X-Frame-Options"] = "SAMEORIGIN";
      headers["Content-Security-Policy"] = "frame-ancestors 'self'";
    }

    return new Response(fileStream, { headers });
  } catch (err) {
    console.error("Error serving shared file:", err);
    throw error(404, "File not found");
  }
};
