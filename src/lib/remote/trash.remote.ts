import { command, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureTrashFolder } from "$lib/server/folderUtils";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/mini";
import { getFolderChildren } from "./folders.remote";
import { getRootItems, getTrashedItems } from "./load.remote";
import { deleteFile as deleteFromStorage } from "$lib/server/storage";

async function collectDescendantFolderIds(
  userId: string,
  rootFolderIds: string[]
): Promise<string[]> {
  const visited = new Set<string>(rootFolderIds);
  let frontier = [...rootFolderIds];

  while (frontier.length > 0) {
    const children = await db
      .select({ id: table.folder.id })
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, userId),
          inArray(table.folder.parentId, frontier)
        )
      );

    const next: string[] = [];
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        next.push(child.id);
      }
    }
    frontier = next;
  }

  return Array.from(visited);
}

async function getFileRecordsForFolderIds(
  userId: string,
  folderIds: string[]
): Promise<{ id: string; storageKey: string }[]> {
  if (folderIds.length === 0) return [];
  return db
    .select({ id: table.file.id, storageKey: table.file.storageKey })
    .from(table.file)
    .where(
      and(
        eq(table.file.ownerId, userId),
        inArray(table.file.folderId, folderIds)
      )
    );
}

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
      let trashedItem: any;
      const txErr = await db.transaction(async (tx) => {
        const [t] = await tx
          .select()
          .from(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.itemId, itemId),
              eq(table.trashedItem.ownerId, user.id)
            )
          );
        if (!t) return "Trashed item not found" as const;
        if (t.itemType !== "file") return "Item is not a file" as const;

        trashedItem = t;

        await tx
          .update(table.file)
          .set({
            folderId: t.originalFolderId ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(table.file.id, itemId));

        await tx
          .delete(table.trashedItem)
          .where(eq(table.trashedItem.id, t.id));

        return;
      });

      if (txErr) return { error: txErr };

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
      let trashedItem: any;
      const txErr = await db.transaction(async (tx) => {
        const [t] = await tx
          .select()
          .from(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.itemId, itemId),
              eq(table.trashedItem.ownerId, user.id)
            )
          );
        if (!t) return "Trashed item not found" as const;
        if (t.itemType !== "folder") return "Item is not a folder" as const;

        trashedItem = t;

        await tx
          .update(table.folder)
          .set({
            parentId: t.originalParentId,
            updatedAt: new Date(),
          })
          .where(eq(table.folder.id, itemId));

        await tx
          .delete(table.trashedItem)
          .where(eq(table.trashedItem.id, t.id));

        return;
      });

      if (txErr) return { error: txErr };

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
      let trashRecord: any;
      await db.transaction(async (tx) => {
        [trashRecord] = await tx
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
          const trashFolder = await ensureTrashFolder(user.id);
          if (itemType === "file") {
            await tx
              .update(table.file)
              .set({
                folderId: trashFolder.id,
                updatedAt: new Date(),
              })
              .where(eq(table.file.id, itemId));
          } else if (itemType === "folder") {
            await tx
              .update(table.folder)
              .set({
                parentId: trashFolder.id,
                updatedAt: new Date(),
              })
              .where(eq(table.folder.id, itemId));
          }
        }
      });

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
      const txErr = await db.transaction(async (tx) => {
        const [trashedItem] = await tx
          .select()
          .from(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.itemId, itemId),
              eq(table.trashedItem.ownerId, user.id)
            )
          );

        if (!trashedItem) return "Trashed item not found" as const;
        if (trashedItem.itemType !== "file")
          return "Item is not a file" as const;

        try {
          await deleteFromStorage(trashedItem.itemId);
        } catch (error) {
          console.error("Error deleting file blob from storage:", {
            itemId,
            storageKey: trashedItem.itemId,
            error,
          });
        }

        await tx.delete(table.file).where(eq(table.file.id, itemId));
        await tx
          .delete(table.trashedItem)
          .where(eq(table.trashedItem.id, trashedItem.id));

        return;
      });

      if (txErr) return { error: txErr };

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
      const txErr = await db.transaction(async (tx) => {
        const [trashedItem] = await tx
          .select()
          .from(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.itemId, itemId),
              eq(table.trashedItem.ownerId, user.id)
            )
          );

        if (!trashedItem) return "Trashed item not found" as const;
        if (trashedItem.itemType !== "folder")
          return "Item is not a folder" as const;

        const allFolderIds = await collectDescendantFolderIds(user.id, [
          itemId,
        ]);
        const fileRecords = await getFileRecordsForFolderIds(
          user.id,
          allFolderIds
        );

        const storageKeys = Array.from(
          new Set(fileRecords.map((r) => r.storageKey))
        );
        await Promise.allSettled(storageKeys.map((k) => deleteFromStorage(k)));

        await tx.delete(table.folder).where(eq(table.folder.id, itemId));

        await tx
          .delete(table.trashedItem)
          .where(eq(table.trashedItem.id, trashedItem.id));

        return;
      });

      if (txErr) return { error: txErr };

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
      await db.transaction(async (tx) => {
        const trashFolder = await ensureTrashFolder(user.id);

        await tx.insert(table.trashedItem).values(
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
          await tx
            .update(table.file)
            .set({ folderId: trashFolder.id, updatedAt: new Date() })
            .where(inArray(table.file.id, fileIds));
        }

        if (folderIds.length > 0) {
          await tx
            .update(table.folder)
            .set({ parentId: trashFolder.id, updatedAt: new Date() })
            .where(inArray(table.folder.id, folderIds));
        }
      });

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
      let filesToRestore: any[] = [];
      let foldersToRestore: any[] = [];
      const txErr = await db.transaction(async (tx) => {
        const trashedItems = await tx
          .select()
          .from(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.ownerId, user.id),
              inArray(table.trashedItem.itemId, itemIds)
            )
          );

        if (trashedItems.length < itemIds.length) {
          return "One or more items not found in trash";
        }

        filesToRestore = trashedItems.filter((t) => t.itemType === "file");
        foldersToRestore = trashedItems.filter((t) => t.itemType === "folder");

        for (const t of filesToRestore) {
          await tx
            .update(table.file)
            .set({
              folderId: t.originalFolderId ?? undefined,
              updatedAt: new Date(),
            })
            .where(eq(table.file.id, t.itemId));
        }
        for (const t of foldersToRestore) {
          await tx
            .update(table.folder)
            .set({ parentId: t.originalParentId, updatedAt: new Date() })
            .where(eq(table.folder.id, t.itemId));
        }

        await tx
          .delete(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.ownerId, user.id),
              inArray(table.trashedItem.itemId, itemIds)
            )
          );

        return;
      });

      if (txErr) return { error: txErr };

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
      const txErr = await db.transaction(async (tx) => {
        const trashedItems = await tx
          .select()
          .from(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.ownerId, user.id),
              inArray(table.trashedItem.itemId, itemIds)
            )
          );

        if (trashedItems.length < itemIds.length) {
          return "One or more items not found in trash";
        }

        const fileIds = trashedItems
          .filter((t) => t.itemType === "file")
          .map((t) => t.itemId);
        const folderIds = trashedItems
          .filter((t) => t.itemType === "folder")
          .map((t) => t.itemId);

        if (fileIds.length > 0) {
          const fileRecords = await tx
            .select({ id: table.file.id, storageKey: table.file.storageKey })
            .from(table.file)
            .where(
              and(
                inArray(table.file.id, fileIds),
                eq(table.file.ownerId, user.id)
              )
            );

          await Promise.allSettled(
            fileRecords.map((r) => deleteFromStorage(r.storageKey))
          );

          await tx.delete(table.file).where(inArray(table.file.id, fileIds));
        }
        if (folderIds.length > 0) {
          const allFolderIds = await collectDescendantFolderIds(
            user.id,
            folderIds
          );
          const fileRecordsUnderFolders = await getFileRecordsForFolderIds(
            user.id,
            allFolderIds
          );

          const folderStorageKeys = Array.from(
            new Set(fileRecordsUnderFolders.map((r) => r.storageKey))
          );
          await Promise.allSettled(
            folderStorageKeys.map((k) => deleteFromStorage(k))
          );

          await tx
            .delete(table.folder)
            .where(inArray(table.folder.id, folderIds));
        }

        await tx
          .delete(table.trashedItem)
          .where(
            and(
              eq(table.trashedItem.ownerId, user.id),
              inArray(table.trashedItem.itemId, itemIds)
            )
          );

        return;
      });

      if (txErr) return { error: txErr };

      await getTrashedItems().refresh();

      return { data: { success: true, count: itemIds.length } };
    } catch (err) {
      console.error("Error bulk permanently deleting items:", err);
      return { error: "Failed to bulk permanently delete items" };
    }
  }
);
