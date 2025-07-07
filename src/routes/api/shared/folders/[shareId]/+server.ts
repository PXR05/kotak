import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

async function validateFolderShare(shareId: string, userEmail?: string) {
  const [folderShare] = await db
    .select({
      share: table.folderShare,
      folder: table.folder,
      sharedBy: { id: table.user.id, email: table.user.email },
    })
    .from(table.folderShare)
    .innerJoin(table.folder, eq(table.folderShare.folderId, table.folder.id))
    .innerJoin(table.user, eq(table.folderShare.sharedBy, table.user.id))
    .where(eq(table.folderShare.id, shareId));

  if (!folderShare) return null;

  if (folderShare.share.expiresAt && new Date() > folderShare.share.expiresAt) {
    return null;
  }

  if (folderShare.share.isPublic) return folderShare;

  if (!userEmail) return null;

  const [recipient] = await db
    .select()
    .from(table.folderShareRecipient)
    .where(
      and(
        eq(table.folderShareRecipient.shareId, shareId),
        eq(table.folderShareRecipient.email, userEmail.toLowerCase())
      )
    );

  return recipient ? folderShare : null;
}

export const GET: RequestHandler = async ({ params, locals }) => {
  const shareId = params.shareId;

  if (!shareId) {
    throw error(400, "Missing share ID");
  }

  const userEmail = locals.user?.email;
  const shareData = await validateFolderShare(shareId, userEmail);

  if (!shareData) {
    throw error(404, "Shared folder not found or access denied");
  }

  const { folder, share, sharedBy } = shareData;

  const [files, subfolders] = await Promise.all([
    db.select().from(table.file).where(eq(table.file.folderId, folder.id)),
    db.select().from(table.folder).where(eq(table.folder.parentId, folder.id)),
  ]);

  return json({
    folder,
    share,
    sharedBy,
    files,
    subfolders,
  });
};
