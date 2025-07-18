import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  try {
    const trashedItems = (
      await db
        .select()
        .from(table.trashedItem)
        .where(eq(table.trashedItem.ownerId, locals.user.id))
        .orderBy(table.trashedItem.trashedAt)
    ).map((item) => ({
      id: item.id,
      name: item.name,
      itemId: item.itemId,
      type: item.itemType as "file" | "folder",
      ownerId: item.ownerId,
      originalFolderId: item.originalFolderId,
      originalParentId: item.originalParentId,
      trashedAt: item.trashedAt,
      updatedAt: item.trashedAt,
      createdAt: item.trashedAt,
    }));

    return {
      user: locals.user,
      trashedItems,
    };
  } catch (error) {
    console.error("Error loading trash:", error);
    return {
      user: locals.user,
      trashedItems: [],
    };
  }
};
