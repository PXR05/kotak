import { json, error } from "@sveltejs/kit";
import { getFileStream } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

async function validateFolderShareFileAccess(
  shareId: string,
  fileId: string,
  userEmail?: string
) {
  const [folderShare] = await db
    .select({
      share: table.folderShare,
      folder: table.folder,
      sharedBy: {
        id: table.user.id,
        email: table.user.email,
      },
    })
    .from(table.folderShare)
    .innerJoin(table.folder, eq(table.folderShare.folderId, table.folder.id))
    .innerJoin(table.user, eq(table.folderShare.sharedBy, table.user.id))
    .where(eq(table.folderShare.id, shareId));

  if (!folderShare) {
    return null;
  }

  if (folderShare.share.expiresAt && new Date() > folderShare.share.expiresAt) {
    return null;
  }

  if (!folderShare.share.isPublic) {
    if (!userEmail) {
      return null;
    }

    const [recipient] = await db
      .select()
      .from(table.folderShareRecipient)
      .where(
        and(
          eq(table.folderShareRecipient.shareId, shareId),
          eq(table.folderShareRecipient.email, userEmail.toLowerCase())
        )
      );

    if (!recipient) {
      return null;
    }
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(eq(table.file.id, fileId));

  if (!file) {
    return null;
  }

  const isFileInSharedFolder = await isFileInFolder(
    file.folderId,
    folderShare.folder.id
  );

  if (!isFileInSharedFolder) {
    return null;
  }

  return { folderShare, file };
}

async function isFileInFolder(
  fileFolderId: string,
  targetFolderId: string
): Promise<boolean> {
  let currentFolderId: string | null = fileFolderId;

  while (currentFolderId) {
    if (currentFolderId === targetFolderId) {
      return true;
    }

    const [folder] = await db
      .select({ parentId: table.folder.parentId })
      .from(table.folder)
      .where(eq(table.folder.id, currentFolderId));

    if (!folder) {
      break;
    }

    currentFolderId = folder.parentId;
  }

  return false;
}

export const GET = async ({ params, url, locals }) => {
  const shareId = params.shareId;
  const fileId = params.fileId;
  const download = url.searchParams.get("download");

  if (!shareId || !fileId) {
    throw error(400, "Missing share ID or file ID");
  }

  const userEmail = locals.user?.email;

  const shareData = await validateFolderShareFileAccess(
    shareId,
    fileId,
    userEmail
  );

  if (!shareData) {
    throw error(404, "Shared file not found or access denied");
  }

  const { file } = shareData;

  try {
    const fileStream = getFileStream(file.storageKey);

    const encodedFilename = encodeURIComponent(file.name);
    const asciiFilename = file.name.replace(/[^\x20-\x7E]/g, "");

    let contentDisposition: string;
    if (download === "true") {
      contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
    } else {
      contentDisposition = `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
    }

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
    console.error("Error serving shared folder file:", err);
    throw error(404, "File not found");
  }
};
