import { command, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureTrashFolder } from "$lib/server/folderUtils";
import { and, eq } from "drizzle-orm";
import * as z from "zod/mini";
import { getFolderChildren } from "./folders.remote";
import { getRootItems, getTrashedItems } from "./load.remote";

export const restoreFile = command(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing itemId",
      };
    }

    try {
      const [trashedItem] = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.itemId, itemId),
            eq(table.trashedItem.ownerId, user.id)
          )
        );

      if (!trashedItem) {
        return {
          error: "Trashed item not found",
        };
      }

      if (trashedItem.itemType !== "file") {
        return {
          error: "Item is not a file",
        };
      }

      await db
        .update(table.file)
        .set({
          folderId: trashedItem.originalFolderId ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(table.file.id, itemId));

      await db
        .delete(table.trashedItem)
        .where(eq(table.trashedItem.id, trashedItem.id));

      const refreshPromises = [getTrashedItems().refresh()];

      if (trashedItem.originalFolderId?.startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else if (trashedItem.originalFolderId) {
        refreshPromises.push(
          getFolderChildren(trashedItem.originalFolderId).refresh()
        );
      }

      await Promise.all(refreshPromises);

      return {
        data: { success: true, message: "File restored successfully" },
      };
    } catch (err) {
      console.error("Error restoring file:", err);
      return {
        error: "Failed to restore file",
      };
    }
  }
);

export const restoreFolder = command(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing itemId",
      };
    }

    try {
      const [trashedItem] = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.itemId, itemId),
            eq(table.trashedItem.ownerId, user.id)
          )
        );

      if (!trashedItem) {
        return {
          error: "Trashed item not found",
        };
      }

      if (trashedItem.itemType !== "folder") {
        return {
          error: "Item is not a folder",
        };
      }

      await db
        .update(table.folder)
        .set({
          parentId: trashedItem.originalParentId,
          updatedAt: new Date(),
        })
        .where(eq(table.folder.id, itemId));

      await db
        .delete(table.trashedItem)
        .where(eq(table.trashedItem.id, trashedItem.id));

      const refreshPromises = [getTrashedItems().refresh()];

      if (trashedItem.originalParentId?.startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else if (trashedItem.originalParentId) {
        refreshPromises.push(
          getFolderChildren(trashedItem.originalParentId).refresh()
        );
      }

      await Promise.all(refreshPromises);

      return {
        data: { success: true, message: "Folder restored successfully" },
      };
    } catch (err) {
      console.error("Error restoring folder:", err);
      return {
        error: "Failed to restore folder",
      };
    }
  }
);

export const trashItem = command(
  z.object({
    itemId: z.string(),
    itemType: z.enum(["file", "folder"]),
    originalFolderId: z.nullable(z.optional(z.string())),
    originalParentId: z.nullable(z.optional(z.string())),
    name: z.string(),
  }),
  async ({ itemId, itemType, originalFolderId, originalParentId, name }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId || !itemType || !name) {
      return {
        error: "Missing required fields: itemId, itemType, or name",
      };
    }

    if (itemType !== "file" && itemType !== "folder") {
      return {
        error: "Invalid itemType, must be 'file' or 'folder'",
      };
    }

    try {
      const [trashRecord] = await db
        .insert(table.trashedItem)
        .values({
          id: `trash-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          itemId,
          itemType,
          originalFolderId: originalFolderId || null,
          originalParentId: originalParentId || null,
          ownerId: user.id,
          trashedAt: new Date(),
          name,
        })
        .returning();

      if (trashRecord) {
        if (itemType === "file") {
          await db
            .update(table.file)
            .set({
              folderId: (await ensureTrashFolder(user.id)).id,
              updatedAt: new Date(),
            })
            .where(eq(table.file.id, itemId));
        } else if (itemType === "folder") {
          await db
            .update(table.folder)
            .set({
              parentId: (await ensureTrashFolder(user.id)).id,
              updatedAt: new Date(),
            })
            .where(eq(table.folder.id, itemId));
        }
      }

      const refreshPromises = [getTrashedItems().refresh()];

      if (itemType === "file" && originalFolderId?.startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else if (itemType === "file" && originalFolderId) {
        refreshPromises.push(getFolderChildren(originalFolderId).refresh());
      } else if (
        itemType === "folder" &&
        originalParentId?.startsWith("root-")
      ) {
        refreshPromises.push(getRootItems().refresh());
      } else if (itemType === "folder" && originalParentId) {
        refreshPromises.push(getFolderChildren(originalParentId).refresh());
      }

      await Promise.all(refreshPromises);

      return {
        data: trashRecord,
      };
    } catch (err) {
      console.error("Error recording trashed item:", err);
      return {
        error: "Failed to record trashed item",
      };
    }
  }
);

export const permanentDeleteFile = command(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing itemId",
      };
    }

    try {
      const [trashedItem] = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.itemId, itemId),
            eq(table.trashedItem.ownerId, user.id)
          )
        );

      if (!trashedItem) {
        return {
          error: "Trashed item not found",
        };
      }

      if (trashedItem.itemType !== "file") {
        return {
          error: "Item is not a file",
        };
      }

      await db.delete(table.file).where(eq(table.file.id, itemId));

      await db
        .delete(table.trashedItem)
        .where(eq(table.trashedItem.id, trashedItem.id));

      await getTrashedItems().refresh();

      return {
        data: { success: true, message: "File permanently deleted" },
      };
    } catch (err) {
      console.error("Error permanently deleting file:", err);
      return {
        error: "Failed to permanently delete file",
      };
    }
  }
);

export const permanentDeleteFolder = command(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing itemId",
      };
    }

    try {
      const [trashedItem] = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.itemId, itemId),
            eq(table.trashedItem.ownerId, user.id)
          )
        );

      if (!trashedItem) {
        return {
          error: "Trashed item not found",
        };
      }

      if (trashedItem.itemType !== "folder") {
        return {
          error: "Item is not a folder",
        };
      }

      await db.delete(table.folder).where(eq(table.folder.id, itemId));

      await db
        .delete(table.trashedItem)
        .where(eq(table.trashedItem.id, trashedItem.id));

      await getTrashedItems().refresh();

      return {
        data: { success: true, message: "Folder permanently deleted" },
      };
    } catch (err) {
      console.error("Error permanently deleting folder:", err);
      return {
        error: "Failed to permanently delete folder",
      };
    }
  }
);

export const emptyTrash = command(async () => {
  const {
    locals: { user },
  } = getRequestEvent();
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  try {
    const trashedItems = await db
      .select()
      .from(table.trashedItem)
      .where(eq(table.trashedItem.ownerId, user.id));

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
      .where(eq(table.trashedItem.ownerId, user.id));

    await getTrashedItems().refresh();

    return {
      data: { success: true, message: "Trash emptied successfully" },
    };
  } catch (err) {
    console.error("Error emptying trash:", err);
    return {
      error: "Failed to empty trash",
    };
  }
});
