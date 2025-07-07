import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findFileByIdOrStorageKey(fileId: string, userId: string) {
  if (UUID_V4_PATTERN.test(fileId)) {
    return (
      (
        await db
          .select()
          .from(table.file)
          .where(
            and(
              eq(table.file.storageKey, fileId),
              eq(table.file.ownerId, userId)
            )
          )
      )[0] ?? null
    );
  }

  return (
    (
      await db
        .select()
        .from(table.file)
        .where(and(eq(table.file.id, fileId), eq(table.file.ownerId, userId)))
    )[0] ?? null
  );
}

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const fileId = params.id;
  if (!fileId) {
    throw error(400, "Missing file ID");
  }

  const file = await findFileByIdOrStorageKey(fileId, locals.user.id);
  if (!file) {
    throw error(404, "File not found or access denied");
  }

  const [existingShare] = await db
    .select({
      share: table.fileShare,
      recipients: table.fileShareRecipient,
    })
    .from(table.fileShare)
    .leftJoin(
      table.fileShareRecipient,
      eq(table.fileShare.id, table.fileShareRecipient.shareId)
    )
    .where(
      and(
        eq(table.fileShare.fileId, file.id),
        eq(table.fileShare.sharedBy, locals.user.id)
      )
    );

  if (!existingShare) {
    throw error(404, "No existing share found");
  }

  const recipients = await db
    .select()
    .from(table.fileShareRecipient)
    .where(eq(table.fileShareRecipient.shareId, existingShare.share.id));

  return json({
    shareId: existingShare.share.id,
    isPublic: existingShare.share.isPublic,
    emails: recipients.map((r) => r.email),
    expiresAt: existingShare.share.expiresAt?.toISOString(),
  });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const fileId = params.id;
  if (!fileId) {
    throw error(400, "Missing file ID");
  }

  const { isPublic, emails, expiresAt } = await request.json();

  if (typeof isPublic !== "boolean") {
    throw error(400, "isPublic must be a boolean");
  }

  const file = await findFileByIdOrStorageKey(fileId, locals.user.id);

  if (!file) {
    throw error(404, "File not found or access denied");
  }

  try {
    const [existingShare] = await db
      .select()
      .from(table.fileShare)
      .where(
        and(
          eq(table.fileShare.fileId, file.id),
          eq(table.fileShare.sharedBy, locals.user.id)
        )
      );

    const expirationDate = expiresAt ? new Date(expiresAt) : null;
    let shareId: string;
    
    if (existingShare) {
      shareId = existingShare.id;
      await db
        .update(table.fileShare)
        .set({
          isPublic,
          expiresAt: expirationDate,
        })
        .where(eq(table.fileShare.id, shareId))
        .returning();

      await db
        .delete(table.fileShareRecipient)
        .where(eq(table.fileShareRecipient.shareId, shareId));
    } else {
      shareId = nanoid();
      await db
        .insert(table.fileShare)
        .values({
          id: shareId,
          fileId: file.id,
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

      await db.insert(table.fileShareRecipient).values(recipients);
    }

    const publicUrl = isPublic ? `/shared/files/${shareId}` : undefined;

    return json({
      success: true,
      shareId,
      publicUrl,
      message: existingShare
        ? "File sharing updated successfully"
        : "File shared successfully",
    });
  } catch (err) {
    throw error(500, "Failed to share file");
  }
};
