import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  try {
    const trashedItems = await db
      .select({
        id: table.trashedItem.id,
        itemId: table.trashedItem.itemId,
        itemType: table.trashedItem.itemType,
        originalFolderId: table.trashedItem.originalFolderId,
        originalParentId: table.trashedItem.originalParentId,
        trashedAt: table.trashedItem.trashedAt,
        name: table.trashedItem.name,
      })
      .from(table.trashedItem)
      .where(eq(table.trashedItem.ownerId, locals.user.id))
      .orderBy(table.trashedItem.trashedAt);

    console.log(trashedItems);

    return json(trashedItems);
  } catch (err) {
    console.error("Error fetching trashed items:", err);
    throw error(500, "Failed to fetch trashed items");
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const { action, itemId } = await request.json();

  if (!action || !itemId) {
    throw error(400, "Missing action or itemId");
  }

  try {
    if (action === "restore") {
      const [trashedItem] = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.itemId, itemId),
            eq(table.trashedItem.ownerId, locals.user.id)
          )
        );

      if (!trashedItem) {
        throw error(404, "Trashed item not found");
      }

      if (trashedItem.itemType === "file") {
        await db
          .update(table.file)
          .set({
            folderId: trashedItem.originalFolderId ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(table.file.id, itemId));
      } else if (trashedItem.itemType === "folder") {
        await db
          .update(table.folder)
          .set({
            parentId: trashedItem.originalParentId,
            updatedAt: new Date(),
          })
          .where(eq(table.folder.id, itemId));
      }

      await db
        .delete(table.trashedItem)
        .where(eq(table.trashedItem.id, trashedItem.id));

      return json({ success: true, message: "Item restored successfully" });
    } else if (action === "permanentDelete") {
      const [trashedItem] = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.itemId, itemId),
            eq(table.trashedItem.ownerId, locals.user.id)
          )
        );

      if (!trashedItem) {
        throw error(404, "Trashed item not found");
      }

      if (trashedItem.itemType === "file") {
        await db.delete(table.file).where(eq(table.file.id, itemId));
      } else if (trashedItem.itemType === "folder") {
        await db.delete(table.folder).where(eq(table.folder.id, itemId));
      }

      await db
        .delete(table.trashedItem)
        .where(eq(table.trashedItem.id, trashedItem.id));

      return json({ success: true, message: "Item permanently deleted" });
    } else {
      throw error(400, "Invalid action");
    }
  } catch (err) {
    console.error(`Error performing ${action}:`, err);
    throw error(500, `Failed to ${action} item`);
  }
};

export const DELETE: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  try {
    const trashedItems = await db
      .select()
      .from(table.trashedItem)
      .where(eq(table.trashedItem.ownerId, locals.user.id));

    for (const trashedItem of trashedItems) {
      if (trashedItem.itemType === "file") {
        await db
          .delete(table.file)
          .where(eq(table.file.id, trashedItem.itemId));
      } else if (trashedItem.itemType === "folder") {
        await db
          .delete(table.folder)
          .where(eq(table.folder.id, trashedItem.itemId));
      }
    }

    await db
      .delete(table.trashedItem)
      .where(eq(table.trashedItem.ownerId, locals.user.id));

    return json({ success: true, message: "Trash emptied successfully" });
  } catch (err) {
    console.error("Error emptying trash:", err);
    throw error(500, "Failed to empty trash");
  }
};
