import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const folderId = params.id;
  if (!folderId) {
    throw error(400, "Missing folder ID");
  }

  const { isPublic, emails, expiresAt } = await request.json();

  if (typeof isPublic !== "boolean") {
    throw error(400, "isPublic must be a boolean");
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.id, folderId),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (!folder) {
    throw error(404, "Folder not found or access denied");
  }

  if (folder.name === "__root__" || folder.name === "__trash__") {
    throw error(400, "Cannot share system folders");
  }

  try {
    const [existingShare] = await db
      .select()
      .from(table.folderShare)
      .where(
        and(
          eq(table.folderShare.folderId, folder.id),
          eq(table.folderShare.sharedBy, locals.user.id)
        )
      );

    const expirationDate = expiresAt ? new Date(expiresAt) : null;
    let shareId: string;
    
    if (existingShare) {
      shareId = existingShare.id;
      await db
        .update(table.folderShare)
        .set({
          isPublic,
          expiresAt: expirationDate,
        })
        .where(eq(table.folderShare.id, shareId))
        .returning();

      await db
        .delete(table.folderShareRecipient)
        .where(eq(table.folderShareRecipient.shareId, shareId));
    } else {
      shareId = nanoid();
      await db
        .insert(table.folderShare)
        .values({
          id: shareId,
          folderId: folder.id,
          sharedBy: locals.user.id,
          permissions: "read",
          isPublic,
          expiresAt: expirationDate,
        })
        .returning();
    }

    if (!isPublic && emails && Array.isArray(emails) && emails.length > 0) {
      const recipients = emails.map((email: string) => ({
        id: nanoid(),
        shareId,
        email: email.trim().toLowerCase(),
      }));

      await db.insert(table.folderShareRecipient).values(recipients);
    }

    const publicUrl = isPublic ? `/shared/folders/${shareId}` : undefined;

    return json({
      success: true,
      shareId,
      publicUrl,
      message: existingShare
        ? "Folder sharing updated successfully"
        : "Folder shared successfully",
    });
  } catch (err) {
    throw error(500, "Failed to share folder");
  }
};

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const folderId = params.id;
  if (!folderId) {
    throw error(400, "Missing folder ID");
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.id, folderId),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (!folder) {
    throw error(404, "Folder not found or access denied");
  }

  const [existingShare] = await db
    .select()
    .from(table.folderShare)
    .where(
      and(
        eq(table.folderShare.folderId, folder.id),
        eq(table.folderShare.sharedBy, locals.user.id)
      )
    );

  if (!existingShare) {
    throw error(404, "No existing share found");
  }

  const recipients = await db
    .select()
    .from(table.folderShareRecipient)
    .where(eq(table.folderShareRecipient.shareId, existingShare.id));

  return json({
    shareId: existingShare.id,
    isPublic: existingShare.isPublic,
    emails: recipients.map((r) => r.email),
    expiresAt: existingShare.expiresAt?.toISOString(),
  });
};
