import { getRequestEvent, query } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { FileItem, TrashedItem } from "$lib/types/file";
import { and, eq } from "drizzle-orm";
import * as z from "zod/mini";

export const getBreadcrumbs = query(
  z.nullable(z.optional(z.string())),
  async (folderId) => {
    if (!folderId) {
      return {
        data: [],
      };
    }

    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    const [folder] = await db
      .select()
      .from(table.folder)
      .where(
        and(eq(table.folder.id, folderId), eq(table.folder.ownerId, user.id))
      );

    if (!folder) {
      return {
        data: [],
      };
    }

    const allFolders = await db
      .select()
      .from(table.folder)
      .where(eq(table.folder.ownerId, user.id));

    const folderMap = new Map(allFolders.map((f) => [f.id, f]));

    let currentBreadcrumb: typeof folder | null = folder;
    const tempBreadcrumbs: Array<{ id: string; name: string }> = [];

    while (currentBreadcrumb && currentBreadcrumb.name !== "__root__") {
      tempBreadcrumbs.unshift({
        id: currentBreadcrumb.id,
        name: currentBreadcrumb.name,
      });

      if (currentBreadcrumb.parentId) {
        currentBreadcrumb = folderMap.get(currentBreadcrumb.parentId) || null;
      } else {
        break;
      }
    }

    return {
      data: tempBreadcrumbs,
      error: null,
    };
  }
);

export const getCurrentFolder = query(
  z.nullable(z.optional(z.string())),
  async (folderId) => {
    if (!folderId) {
      return {
        data: {} as FileItem,
      };
    }

    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    const [folder] = await db
      .select()
      .from(table.folder)
      .where(
        and(eq(table.folder.id, folderId), eq(table.folder.ownerId, user.id))
      );

    if (!folder) {
      return {
        data: {} as FileItem,
      };
    }

    return {
      data: { ...folder, type: "folder" as const },
    };
  }
);

export const getTrashedItems = query(async () => {
  const {
    locals: { user },
  } = getRequestEvent();
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  try {
    const trashedItems: (TrashedItem & FileItem)[] = (
      await db
        .select()
        .from(table.trashedItem)
        .where(eq(table.trashedItem.ownerId, user.id))
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
      data: trashedItems,
    };
  } catch (error) {
    console.error("Error loading trashed items:", error);
    return {
      error: "Failed to load trashed items",
    };
  }
});

export const getRootItems = query(async () => {
  const {
    locals: { user },
  } = getRequestEvent();
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  try {
    const rootFolder = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, user.id),
          eq(table.folder.name, "__root__")
        )
      )
      .limit(1)
      .then((folders) => folders[0]);

    if (!rootFolder) {
      return {
        data: [],
      };
    }

    const rootFolders = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, user.id),
          eq(table.folder.parentId, rootFolder.id)
        )
      )
      .orderBy(table.folder.name);

    const rootFiles = await db
      .select()
      .from(table.file)
      .where(
        and(
          eq(table.file.ownerId, user.id),
          eq(table.file.folderId, rootFolder.id)
        )
      )
      .orderBy(table.file.name);

    return {
      data: [
        ...rootFolders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          type: "folder" as const,
          ownerId: folder.ownerId,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        })),
        ...rootFiles.map((file) => ({
          id: file.id,
          name: file.name,
          type: "file" as const,
          storageKey: file.storageKey,
          ownerId: file.ownerId,
          folderId: file.folderId,
          size: file.size,
          mimeType: file.mimeType,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
      ] as FileItem[],
    };
  } catch (error) {
    console.error("Error loading root items:", error);
    return {
      error: "Failed to load root items",
    };
  }
});
