import { command, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureTrashFolder } from "$lib/server/folderUtils";
import { and, eq, inArray } from "drizzle-orm";
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

export const trashItems = command(
  z.object({
    items: z.array(
      z.object({
        itemId: z.string(),
        itemType: z.enum(["file", "folder"]),
        originalFolderId: z.nullable(z.optional(z.string())),
        originalParentId: z.nullable(z.optional(z.string())),
        name: z.string(),
      })
    ),
  }),
  async ({ items }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!items || items.length === 0) {
      return {
        error: "No items provided",
      };
    }

    try {
      const trashFolder = await ensureTrashFolder(user.id);

      await db.insert(table.trashedItem).values(
        items.map((i) => ({
          id: `trash-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          itemId: i.itemId,
          itemType: i.itemType,
          originalFolderId: i.originalFolderId || null,
          originalParentId: i.originalParentId || null,
          ownerId: user.id,
          trashedAt: new Date(),
          name: i.name,
        }))
      );

      const fileIds = items
        .filter((i) => i.itemType === "file")
        .map((i) => i.itemId);
      const folderIds = items
        .filter((i) => i.itemType === "folder")
        .map((i) => i.itemId);

      if (fileIds.length > 0) {
        await db
          .update(table.file)
          .set({ folderId: trashFolder.id, updatedAt: new Date() })
          .where(inArray(table.file.id, fileIds));
      }

      if (folderIds.length > 0) {
        await db
          .update(table.folder)
          .set({ parentId: trashFolder.id, updatedAt: new Date() })
          .where(inArray(table.folder.id, folderIds));
      }

      const refreshPromises: Array<Promise<unknown>> = [
        getTrashedItems().refresh(),
      ];

      const originalFolderIds = Array.from(
        new Set(items.map((i) => i.originalFolderId).filter(Boolean))
      ) as string[];
      const originalParentIds = Array.from(
        new Set(items.map((i) => i.originalParentId).filter(Boolean))
      ) as string[];

      for (const fid of originalFolderIds) {
        if (fid.startsWith("root-")) {
          refreshPromises.push(getRootItems().refresh());
        } else {
          refreshPromises.push(getFolderChildren(fid).refresh());
        }
      }
      for (const pid of originalParentIds) {
        if (pid.startsWith("root-")) {
          refreshPromises.push(getRootItems().refresh());
        } else {
          refreshPromises.push(getFolderChildren(pid).refresh());
        }
      }

      await Promise.all(refreshPromises);

      return {
        data: { success: true, count: items.length },
      };
    } catch (err) {
      console.error("Error bulk trashing items:", err);
      return {
        error: "Failed to bulk trash items",
      };
    }
  }
);

export const restoreItems = command(
  z.object({
    itemIds: z.array(z.string()),
  }),
  async ({ itemIds }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return { error: "User not authenticated" };
    }

    if (!itemIds || itemIds.length === 0) {
      return { error: "No items provided" };
    }

    try {
      const trashedItems = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.ownerId, user.id),
            inArray(table.trashedItem.itemId, itemIds)
          )
        );

      if (trashedItems.length !== itemIds.length) {
        return { error: "One or more items not found in trash" };
      }

      const filesToRestore = trashedItems.filter((t) => t.itemType === "file");
      const foldersToRestore = trashedItems.filter(
        (t) => t.itemType === "folder"
      );

      for (const t of filesToRestore) {
        await db
          .update(table.file)
          .set({
            folderId: t.originalFolderId ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(table.file.id, t.itemId));
      }
      for (const t of foldersToRestore) {
        await db
          .update(table.folder)
          .set({ parentId: t.originalParentId, updatedAt: new Date() })
          .where(eq(table.folder.id, t.itemId));
      }

      await db
        .delete(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.ownerId, user.id),
            inArray(table.trashedItem.itemId, itemIds)
          )
        );

      const refreshPromises: Array<Promise<unknown>> = [
        getTrashedItems().refresh(),
      ];

      const destFolderIds = Array.from(
        new Set(
          filesToRestore
            .map((t) => t.originalFolderId)
            .filter(Boolean) as string[]
        )
      );
      const destParentIds = Array.from(
        new Set(
          foldersToRestore
            .map((t) => t.originalParentId)
            .filter(Boolean) as string[]
        )
      );

      for (const fid of destFolderIds) {
        if (fid.startsWith("root-"))
          refreshPromises.push(getRootItems().refresh());
        else refreshPromises.push(getFolderChildren(fid).refresh());
      }
      for (const pid of destParentIds) {
        if (pid.startsWith("root-"))
          refreshPromises.push(getRootItems().refresh());
        else refreshPromises.push(getFolderChildren(pid).refresh());
      }

      await Promise.all(refreshPromises);

      return { data: { success: true, count: itemIds.length } };
    } catch (err) {
      console.error("Error bulk restoring items:", err);
      return { error: "Failed to bulk restore items" };
    }
  }
);

export const permanentDeleteItems = command(
  z.object({
    itemIds: z.array(z.string()),
  }),
  async ({ itemIds }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return { error: "User not authenticated" };
    }

    if (!itemIds || itemIds.length === 0) {
      return { error: "No items provided" };
    }

    try {
      const trashedItems = await db
        .select()
        .from(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.ownerId, user.id),
            inArray(table.trashedItem.itemId, itemIds)
          )
        );

      if (trashedItems.length !== itemIds.length) {
        return { error: "One or more items not found in trash" };
      }

      const fileIds = trashedItems
        .filter((t) => t.itemType === "file")
        .map((t) => t.itemId);
      const folderIds = trashedItems
        .filter((t) => t.itemType === "folder")
        .map((t) => t.itemId);

      if (fileIds.length > 0) {
        await db.delete(table.file).where(inArray(table.file.id, fileIds));
      }
      if (folderIds.length > 0) {
        await db
          .delete(table.folder)
          .where(inArray(table.folder.id, folderIds));
      }

      await db
        .delete(table.trashedItem)
        .where(
          and(
            eq(table.trashedItem.ownerId, user.id),
            inArray(table.trashedItem.itemId, itemIds)
          )
        );

      await getTrashedItems().refresh();

      return { data: { success: true, count: itemIds.length } };
    } catch (err) {
      console.error("Error bulk permanently deleting items:", err);
      return { error: "Failed to bulk permanently delete items" };
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
