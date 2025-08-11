import { a } from "../chunks/event-state.js";
import { c } from "../chunks/command.js";
import "@sveltejs/kit";
import { d, t, a as a$1, f } from "../chunks/schema.js";
import { b } from "../chunks/folderUtils.js";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/mini";
import { getFolderChildren } from "./1039kel.js";
import { getTrashedItems, getRootItems } from "./r29gge.js";
import { d as d$1 } from "../chunks/storage.js";
import "../chunks/query.js";
import "../chunks/false.js";
import "../chunks/paths.js";
import "../chunks/validation.js";
async function collectDescendantFolderIds(userId, rootFolderIds) {
  const visited = new Set(rootFolderIds);
  let frontier = [...rootFolderIds];
  while (frontier.length > 0) {
    const children = await d.select({ id: f.id }).from(f).where(
      and(
        eq(f.ownerId, userId),
        inArray(f.parentId, frontier)
      )
    );
    const next = [];
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
async function getFileRecordsForFolderIds(userId, folderIds) {
  if (folderIds.length === 0) return [];
  return d.select({ id: a$1.id, storageKey: a$1.storageKey }).from(a$1).where(
    and(eq(a$1.ownerId, userId), inArray(a$1.folderId, folderIds))
  );
}
const restoreFile = c(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    var _a;
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing itemId"
      };
    }
    try {
      const [trashedItem$1] = await d.select().from(t).where(
        and(
          eq(t.itemId, itemId),
          eq(t.ownerId, user.id)
        )
      );
      if (!trashedItem$1) {
        return {
          error: "Trashed item not found"
        };
      }
      if (trashedItem$1.itemType !== "file") {
        return {
          error: "Item is not a file"
        };
      }
      await d.update(a$1).set({
        folderId: trashedItem$1.originalFolderId ?? void 0,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(a$1.id, itemId));
      await d.delete(t).where(eq(t.id, trashedItem$1.id));
      const refreshPromises = [getTrashedItems().refresh()];
      if ((_a = trashedItem$1.originalFolderId) == null ? void 0 : _a.startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else if (trashedItem$1.originalFolderId) {
        refreshPromises.push(
          getFolderChildren(trashedItem$1.originalFolderId).refresh()
        );
      }
      await Promise.all(refreshPromises);
      return {
        data: { success: true, message: "File restored successfully" }
      };
    } catch (err) {
      console.error("Error restoring file:", err);
      return {
        error: "Failed to restore file"
      };
    }
  }
);
const restoreFolder = c(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    var _a;
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing itemId"
      };
    }
    try {
      const [trashedItem$1] = await d.select().from(t).where(
        and(
          eq(t.itemId, itemId),
          eq(t.ownerId, user.id)
        )
      );
      if (!trashedItem$1) {
        return {
          error: "Trashed item not found"
        };
      }
      if (trashedItem$1.itemType !== "folder") {
        return {
          error: "Item is not a folder"
        };
      }
      await d.update(f).set({
        parentId: trashedItem$1.originalParentId,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(f.id, itemId));
      await d.delete(t).where(eq(t.id, trashedItem$1.id));
      const refreshPromises = [getTrashedItems().refresh()];
      if ((_a = trashedItem$1.originalParentId) == null ? void 0 : _a.startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else if (trashedItem$1.originalParentId) {
        refreshPromises.push(
          getFolderChildren(trashedItem$1.originalParentId).refresh()
        );
      }
      await Promise.all(refreshPromises);
      return {
        data: { success: true, message: "Folder restored successfully" }
      };
    } catch (err) {
      console.error("Error restoring folder:", err);
      return {
        error: "Failed to restore folder"
      };
    }
  }
);
const trashItem = c(
  z.object({
    itemId: z.string(),
    itemType: z.enum(["file", "folder"]),
    originalFolderId: z.nullable(z.optional(z.string())),
    originalParentId: z.nullable(z.optional(z.string())),
    name: z.string()
  }),
  async ({ itemId, itemType, originalFolderId, originalParentId, name }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId || !itemType || !name) {
      return {
        error: "Missing required fields: itemId, itemType, or name"
      };
    }
    if (itemType !== "file" && itemType !== "folder") {
      return {
        error: "Invalid itemType, must be 'file' or 'folder'"
      };
    }
    try {
      const [trashRecord] = await d.insert(t).values({
        id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        itemId,
        itemType,
        originalFolderId: originalFolderId || null,
        originalParentId: originalParentId || null,
        ownerId: user.id,
        trashedAt: /* @__PURE__ */ new Date(),
        name
      }).returning();
      if (trashRecord) {
        if (itemType === "file") {
          await d.update(a$1).set({
            folderId: (await b(user.id)).id,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(a$1.id, itemId));
        } else if (itemType === "folder") {
          await d.update(f).set({
            parentId: (await b(user.id)).id,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(f.id, itemId));
        }
      }
      const refreshPromises = [getTrashedItems().refresh()];
      if (itemType === "file" && (originalFolderId == null ? void 0 : originalFolderId.startsWith("root-"))) {
        refreshPromises.push(getRootItems().refresh());
      } else if (itemType === "file" && originalFolderId) {
        refreshPromises.push(getFolderChildren(originalFolderId).refresh());
      } else if (itemType === "folder" && (originalParentId == null ? void 0 : originalParentId.startsWith("root-"))) {
        refreshPromises.push(getRootItems().refresh());
      } else if (itemType === "folder" && originalParentId) {
        refreshPromises.push(getFolderChildren(originalParentId).refresh());
      }
      await Promise.all(refreshPromises);
      return {
        data: trashRecord
      };
    } catch (err) {
      console.error("Error recording trashed item:", err);
      return {
        error: "Failed to record trashed item"
      };
    }
  }
);
const permanentDeleteFile = c(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing itemId"
      };
    }
    try {
      const [trashedItem$1] = await d.select().from(t).where(
        and(
          eq(t.itemId, itemId),
          eq(t.ownerId, user.id)
        )
      );
      if (!trashedItem$1) {
        return {
          error: "Trashed item not found"
        };
      }
      if (trashedItem$1.itemType !== "file") {
        return {
          error: "Item is not a file"
        };
      }
      const [fileRecord] = await d.select({ id: a$1.id, storageKey: a$1.storageKey }).from(a$1).where(
        and(eq(a$1.id, itemId), eq(a$1.ownerId, user.id))
      );
      if (fileRecord == null ? void 0 : fileRecord.storageKey) {
        try {
          await d$1(fileRecord.storageKey);
        } catch (error) {
          console.error("Error deleting file blob from storage:", {
            itemId,
            storageKey: fileRecord.storageKey,
            error
          });
        }
      }
      await d.delete(a$1).where(eq(a$1.id, itemId));
      await d.delete(t).where(eq(t.id, trashedItem$1.id));
      await getTrashedItems().refresh();
      return {
        data: { success: true, message: "File permanently deleted" }
      };
    } catch (err) {
      console.error("Error permanently deleting file:", err);
      return {
        error: "Failed to permanently delete file"
      };
    }
  }
);
const permanentDeleteFolder = c(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing itemId"
      };
    }
    try {
      const [trashedItem$1] = await d.select().from(t).where(
        and(
          eq(t.itemId, itemId),
          eq(t.ownerId, user.id)
        )
      );
      if (!trashedItem$1) {
        return {
          error: "Trashed item not found"
        };
      }
      if (trashedItem$1.itemType !== "folder") {
        return {
          error: "Item is not a folder"
        };
      }
      const allFolderIds = await collectDescendantFolderIds(user.id, [itemId]);
      const fileRecords = await getFileRecordsForFolderIds(user.id, allFolderIds);
      const storageKeys = Array.from(
        new Set(fileRecords.map((r) => r.storageKey))
      );
      await Promise.allSettled(storageKeys.map((k) => d$1(k)));
      await d.delete(f).where(eq(f.id, itemId));
      await d.delete(t).where(eq(t.id, trashedItem$1.id));
      await getTrashedItems().refresh();
      return {
        data: { success: true, message: "Folder permanently deleted" }
      };
    } catch (err) {
      console.error("Error permanently deleting folder:", err);
      return {
        error: "Failed to permanently delete folder"
      };
    }
  }
);
const trashItems = c(
  z.object({
    items: z.array(
      z.object({
        itemId: z.string(),
        itemType: z.enum(["file", "folder"]),
        originalFolderId: z.nullable(z.optional(z.string())),
        originalParentId: z.nullable(z.optional(z.string())),
        name: z.string()
      })
    )
  }),
  async ({ items }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!items || items.length === 0) {
      return {
        error: "No items provided"
      };
    }
    try {
      const trashFolder = await b(user.id);
      await d.insert(t).values(
        items.map((i) => ({
          id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          itemId: i.itemId,
          itemType: i.itemType,
          originalFolderId: i.originalFolderId || null,
          originalParentId: i.originalParentId || null,
          ownerId: user.id,
          trashedAt: /* @__PURE__ */ new Date(),
          name: i.name
        }))
      );
      const fileIds = items.filter((i) => i.itemType === "file").map((i) => i.itemId);
      const folderIds = items.filter((i) => i.itemType === "folder").map((i) => i.itemId);
      if (fileIds.length > 0) {
        await d.update(a$1).set({ folderId: trashFolder.id, updatedAt: /* @__PURE__ */ new Date() }).where(inArray(a$1.id, fileIds));
      }
      if (folderIds.length > 0) {
        await d.update(f).set({ parentId: trashFolder.id, updatedAt: /* @__PURE__ */ new Date() }).where(inArray(f.id, folderIds));
      }
      const refreshPromises = [
        getTrashedItems().refresh()
      ];
      const originalFolderIds = Array.from(
        new Set(items.map((i) => i.originalFolderId).filter(Boolean))
      );
      const originalParentIds = Array.from(
        new Set(items.map((i) => i.originalParentId).filter(Boolean))
      );
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
        data: { success: true, count: items.length }
      };
    } catch (err) {
      console.error("Error bulk trashing items:", err);
      return {
        error: "Failed to bulk trash items"
      };
    }
  }
);
const restoreItems = c(
  z.object({
    itemIds: z.array(z.string())
  }),
  async ({ itemIds }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return { error: "User not authenticated" };
    }
    if (!itemIds || itemIds.length === 0) {
      return { error: "No items provided" };
    }
    try {
      const trashedItems = await d.select().from(t).where(
        and(
          eq(t.ownerId, user.id),
          inArray(t.itemId, itemIds)
        )
      );
      if (trashedItems.length !== itemIds.length) {
        return { error: "One or more items not found in trash" };
      }
      const filesToRestore = trashedItems.filter((t2) => t2.itemType === "file");
      const foldersToRestore = trashedItems.filter(
        (t2) => t2.itemType === "folder"
      );
      for (const t2 of filesToRestore) {
        await d.update(a$1).set({
          folderId: t2.originalFolderId ?? void 0,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(a$1.id, t2.itemId));
      }
      for (const t2 of foldersToRestore) {
        await d.update(f).set({ parentId: t2.originalParentId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(f.id, t2.itemId));
      }
      await d.delete(t).where(
        and(
          eq(t.ownerId, user.id),
          inArray(t.itemId, itemIds)
        )
      );
      const refreshPromises = [
        getTrashedItems().refresh()
      ];
      const destFolderIds = Array.from(
        new Set(
          filesToRestore.map((t2) => t2.originalFolderId).filter(Boolean)
        )
      );
      const destParentIds = Array.from(
        new Set(
          foldersToRestore.map((t2) => t2.originalParentId).filter(Boolean)
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
const permanentDeleteItems = c(
  z.object({
    itemIds: z.array(z.string())
  }),
  async ({ itemIds }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return { error: "User not authenticated" };
    }
    if (!itemIds || itemIds.length === 0) {
      return { error: "No items provided" };
    }
    try {
      const trashedItems = await d.select().from(t).where(
        and(
          eq(t.ownerId, user.id),
          inArray(t.itemId, itemIds)
        )
      );
      if (trashedItems.length !== itemIds.length) {
        return { error: "One or more items not found in trash" };
      }
      const fileIds = trashedItems.filter((t2) => t2.itemType === "file").map((t2) => t2.itemId);
      const folderIds = trashedItems.filter((t2) => t2.itemType === "folder").map((t2) => t2.itemId);
      if (fileIds.length > 0) {
        const fileRecords = await d.select({ id: a$1.id, storageKey: a$1.storageKey }).from(a$1).where(
          and(
            inArray(a$1.id, fileIds),
            eq(a$1.ownerId, user.id)
          )
        );
        await Promise.allSettled(
          fileRecords.map((r) => d$1(r.storageKey))
        );
        await d.delete(a$1).where(inArray(a$1.id, fileIds));
      }
      if (folderIds.length > 0) {
        const allFolderIds = await collectDescendantFolderIds(user.id, folderIds);
        const fileRecordsUnderFolders = await getFileRecordsForFolderIds(
          user.id,
          allFolderIds
        );
        const folderStorageKeys = Array.from(
          new Set(fileRecordsUnderFolders.map((r) => r.storageKey))
        );
        await Promise.allSettled(
          folderStorageKeys.map((k) => d$1(k))
        );
        await d.delete(f).where(inArray(f.id, folderIds));
      }
      await d.delete(t).where(
        and(
          eq(t.ownerId, user.id),
          inArray(t.itemId, itemIds)
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
const emptyTrash = c(async () => {
  const {
    locals: { user }
  } = a();
  if (!user) {
    return {
      error: "User not authenticated"
    };
  }
  try {
    const trashedItems = await d.select().from(t).where(eq(t.ownerId, user.id));
    const fileIds = trashedItems.filter((t2) => t2.itemType === "file").map((t2) => t2.itemId);
    const folderIds = trashedItems.filter((t2) => t2.itemType === "folder").map((t2) => t2.itemId);
    if (fileIds.length > 0) {
      const fileRecords = await d.select({ id: a$1.id, storageKey: a$1.storageKey }).from(a$1).where(
        and(inArray(a$1.id, fileIds), eq(a$1.ownerId, user.id))
      );
      await Promise.allSettled(
        fileRecords.map((r) => d$1(r.storageKey))
      );
      await d.delete(a$1).where(inArray(a$1.id, fileIds));
    }
    if (folderIds.length > 0) {
      const allFolderIds = await collectDescendantFolderIds(user.id, folderIds);
      const fileRecordsUnderFolders = await getFileRecordsForFolderIds(
        user.id,
        allFolderIds
      );
      const folderStorageKeys = Array.from(
        new Set(fileRecordsUnderFolders.map((r) => r.storageKey))
      );
      await Promise.allSettled(
        folderStorageKeys.map((k) => d$1(k))
      );
      await d.delete(f).where(inArray(f.id, folderIds));
    }
    await d.delete(t).where(eq(t.ownerId, user.id));
    await getTrashedItems().refresh();
    return {
      data: { success: true, message: "Trash emptied successfully" }
    };
  } catch (err) {
    console.error("Error emptying trash:", err);
    return {
      error: "Failed to empty trash"
    };
  }
});
for (const [name, fn] of Object.entries({ emptyTrash, permanentDeleteFile, permanentDeleteFolder, permanentDeleteItems, restoreFile, restoreFolder, restoreItems, trashItem, trashItems })) {
  fn.__.id = "8ra65w/" + name;
  fn.__.name = name;
}
export {
  emptyTrash,
  permanentDeleteFile,
  permanentDeleteFolder,
  permanentDeleteItems,
  restoreFile,
  restoreFolder,
  restoreItems,
  trashItem,
  trashItems
};
