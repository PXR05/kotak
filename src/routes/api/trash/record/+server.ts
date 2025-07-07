import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const { itemId, itemType, originalFolderId, originalParentId, name } =
    await request.json();

  if (!itemId || !itemType || !name) {
    throw error(400, "Missing required fields: itemId, itemType, or name");
  }

  if (itemType !== "file" && itemType !== "folder") {
    throw error(400, "Invalid itemType, must be 'file' or 'folder'");
  }

  try {
    const trashRecord = await db
      .insert(table.trashedItem)
      .values({
        id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        itemId,
        itemType,
        originalFolderId: originalFolderId || null,
        originalParentId: originalParentId || null,
        ownerId: locals.user.id,
        trashedAt: new Date(),
        name,
      })
      .returning();

    return json(trashRecord[0], { status: 201 });
  } catch (err) {
    console.error("Error recording trashed item:", err);
    throw error(500, "Failed to record trashed item");
  }
};
