import { a } from "../chunks/event-state.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import { d, f, t, a as a$1 } from "../chunks/schema.js";
import { and, eq } from "drizzle-orm";
import * as z from "zod/mini";
import "../chunks/command.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getBreadcrumbs = q(
  z.nullable(z.optional(z.string())),
  async (folderId) => {
    if (!folderId) {
      return {
        data: []
      };
    }
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, folderId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        data: []
      };
    }
    const allFolders = await d.select().from(f).where(eq(f.ownerId, user.id));
    const folderMap = new Map(allFolders.map((f2) => [f2.id, f2]));
    let currentBreadcrumb = folder$1;
    const tempBreadcrumbs = [];
    while (currentBreadcrumb && currentBreadcrumb.name !== "__root__") {
      tempBreadcrumbs.unshift({
        id: currentBreadcrumb.id,
        name: currentBreadcrumb.name
      });
      if (currentBreadcrumb.parentId) {
        currentBreadcrumb = folderMap.get(currentBreadcrumb.parentId) || null;
      } else {
        break;
      }
    }
    return {
      data: tempBreadcrumbs,
      error: null
    };
  }
);
const getCurrentFolder = q(
  z.nullable(z.optional(z.string())),
  async (folderId) => {
    if (!folderId) {
      return {
        data: {}
      };
    }
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, folderId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        data: {}
      };
    }
    return {
      data: { ...folder$1, type: "folder" }
    };
  }
);
const getTrashedItems = q(async () => {
  const {
    locals: { user }
  } = a();
  if (!user) {
    return {
      error: "User not authenticated"
    };
  }
  try {
    const trashedItems = (await d.select().from(t).where(eq(t.ownerId, user.id)).orderBy(t.trashedAt)).map((item) => ({
      id: item.id,
      name: item.name,
      itemId: item.itemId,
      type: item.itemType,
      ownerId: item.ownerId,
      originalFolderId: item.originalFolderId,
      originalParentId: item.originalParentId,
      trashedAt: item.trashedAt,
      updatedAt: item.trashedAt,
      createdAt: item.trashedAt
    }));
    return {
      data: trashedItems
    };
  } catch (error) {
    console.error("Error loading trashed items:", error);
    return {
      error: "Failed to load trashed items"
    };
  }
});
const getRootItems = q(async () => {
  const {
    locals: { user }
  } = a();
  if (!user) {
    return {
      error: "User not authenticated"
    };
  }
  try {
    const rootFolder = await d.select().from(f).where(
      and(
        eq(f.ownerId, user.id),
        eq(f.name, "__root__")
      )
    ).limit(1).then((folders) => folders[0]);
    if (!rootFolder) {
      return {
        data: []
      };
    }
    const rootFolders = await d.select().from(f).where(
      and(
        eq(f.ownerId, user.id),
        eq(f.parentId, rootFolder.id)
      )
    ).orderBy(f.name);
    const rootFiles = await d.select().from(a$1).where(
      and(
        eq(a$1.ownerId, user.id),
        eq(a$1.folderId, rootFolder.id)
      )
    ).orderBy(a$1.name);
    return {
      data: [
        ...rootFolders.map((folder2) => ({
          id: folder2.id,
          name: folder2.name,
          type: "folder",
          ownerId: folder2.ownerId,
          parentId: folder2.parentId,
          createdAt: folder2.createdAt,
          updatedAt: folder2.updatedAt
        })),
        ...rootFiles.map((file2) => ({
          id: file2.id,
          name: file2.name,
          type: "file",
          storageKey: file2.storageKey,
          ownerId: file2.ownerId,
          folderId: file2.folderId,
          size: file2.size,
          mimeType: file2.mimeType,
          createdAt: file2.createdAt,
          updatedAt: file2.updatedAt
        }))
      ]
    };
  } catch (error) {
    console.error("Error loading root items:", error);
    return {
      error: "Failed to load root items"
    };
  }
});
for (const [name, fn] of Object.entries({ getBreadcrumbs, getCurrentFolder, getRootItems, getTrashedItems })) {
  fn.__.id = "r29gge/" + name;
  fn.__.name = name;
}
export {
  getBreadcrumbs,
  getCurrentFolder,
  getRootItems,
  getTrashedItems
};
