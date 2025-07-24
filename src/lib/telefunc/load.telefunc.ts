import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { FileItem, TrashedItem } from "$lib/types/file";
import { and, eq } from "drizzle-orm";
import { getContext } from "telefunc";

export async function onGetBreadcrumbs(folderId?: string | null) {
  if (!folderId) {
    return {
      data: [],
    };
  }

  const context = getContext();
  const { user } = context;
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

export async function onGetCurrentFolder(folderId?: string | null) {
  if (!folderId) {
    return {
      data: {} as FileItem,
    };
  }

  const context = getContext();
  const { user } = context;
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

export async function onGetCurrentFolderItems(folderId: string) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const currentFolderItems = db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.ownerId, user.id),
        eq(table.folder.parentId, folderId)
      )
    )
    .orderBy(table.folder.name);

  const currentFolderFiles = db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.ownerId, user.id), eq(table.file.folderId, folderId))
    )
    .orderBy(table.file.name);

  const items = Promise.all([currentFolderItems, currentFolderFiles]).then(
    ([currentFolderItems, currentFolderFiles]) => {
      const transformedCurrentFiles = currentFolderFiles.map((file) => ({
        ...file,
        type: "file" as const,
      }));

      return [
        ...currentFolderItems.map((folder) => ({
          id: folder.id,
          name: folder.name,
          type: "folder" as const,
          ownerId: folder.ownerId,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        })),
        ...transformedCurrentFiles.map((file) => ({
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
      ];
    }
  );

  return {
    data: await items,
  };
}

export async function onGetTrashedItems() {
  const context = getContext();
  const { user } = context;
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
}
