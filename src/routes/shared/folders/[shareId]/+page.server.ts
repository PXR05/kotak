import { error, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const shareId = params.shareId;
  if (!shareId) {
    error(400, "Missing share ID");
  }

  const [shareData] = await db
    .select({
      share: table.folderShare,
      folder: table.folder,
      sharedByUser: {
        id: table.user.id,
        email: table.user.email,
      },
    })
    .from(table.folderShare)
    .innerJoin(table.folder, eq(table.folderShare.folderId, table.folder.id))
    .innerJoin(table.user, eq(table.folderShare.sharedBy, table.user.id))
    .where(eq(table.folderShare.id, shareId));

  if (!shareData) {
    error(404, "Shared folder not found");
  }

  if (shareData.share.expiresAt && shareData.share.expiresAt < new Date()) {
    error(410, "This share has expired");
  }

  if (shareData.share.isPublic) {
    const items = await getFolderContents(shareData.folder.id);
    return {
      folder: {
        ...shareData.folder,
        type: "folder" as const,
      },
      items,
      sharedBy: shareData.sharedByUser,
      share: shareData.share,
      hasAccess: true,
    };
  }

  if (!locals.user) {
    redirect(302, `/auth/login?redirect=/shared/folders/${shareId}`);
  }

  const [recipient] = await db
    .select()
    .from(table.folderShareRecipient)
    .where(
      and(
        eq(table.folderShareRecipient.shareId, shareId),
        eq(table.folderShareRecipient.email, locals.user.email)
      )
    );

  if (!recipient) {
    error(403, "You don't have access to this shared folder");
  }

  const items = await getFolderContents(shareData.folder.id);

  return {
    folder: {
      ...shareData.folder,
      type: "folder" as const,
    },
    items,
    sharedBy: shareData.sharedByUser,
    share: shareData.share,
    hasAccess: true,
  };
};

async function getFolderContents(folderId: string) {
  const [childFolders, childFiles] = await Promise.all([
    db
      .select()
      .from(table.folder)
      .where(eq(table.folder.parentId, folderId))
      .orderBy(table.folder.name),
    db
      .select()
      .from(table.file)
      .where(eq(table.file.folderId, folderId))
      .orderBy(table.file.name),
  ]);

  return [
    ...childFolders.map((folder) => ({
      ...folder,
      type: "folder" as const,
    })),
    ...childFiles.map((file) => ({
      ...file,
      type: "file" as const,
    })),
  ];
}
