import { error, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export const load = async ({ params, locals }) => {
  const shareId = params.shareId;
  if (!shareId) {
    error(400, "Missing share ID");
  }

  const [shareData] = await db
    .select({
      share: table.fileShare,
      file: table.file,
      sharedByUser: {
        id: table.user.id,
        email: table.user.email,
      },
    })
    .from(table.fileShare)
    .innerJoin(table.file, eq(table.fileShare.fileId, table.file.id))
    .innerJoin(table.user, eq(table.fileShare.sharedBy, table.user.id))
    .where(eq(table.fileShare.id, shareId));

  if (!shareData) {
    error(404, "Shared file not found");
  }

  if (shareData.share.expiresAt && shareData.share.expiresAt < new Date()) {
    error(410, "This share has expired");
  }

  if (shareData.share.isPublic) {
    return {
      file: {
        ...shareData.file,
        type: "file" as const,
      },
      sharedBy: shareData.sharedByUser,
      share: shareData.share,
      hasAccess: true,
    };
  }

  if (!locals.user) {
    redirect(302, `/auth/login?redirect=/shared/files/${shareId}`);
  }

  const [recipient] = await db
    .select()
    .from(table.fileShareRecipient)
    .where(
      and(
        eq(table.fileShareRecipient.shareId, shareId),
        eq(table.fileShareRecipient.email, locals.user.email)
      )
    );

  if (!recipient) {
    error(403, "You don't have access to this shared file");
  }

  return {
    file: {
      ...shareData.file,
      type: "file" as const,
    },
    sharedBy: shareData.sharedByUser,
    share: shareData.share,
    hasAccess: true,
  };
};
