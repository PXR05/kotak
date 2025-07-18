import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import * as auth from "$lib/server/auth.js";

export const load = async ({
  locals: { user },
  params: { folder },
}) => {
  if (!user) {
    redirect(302, "/auth/login");
  }

  let currentFolderId: string | null = null;

  if (folder && folder.trim() !== "") {
    const folderParts = folder.split("/").filter((part) => part.trim() !== "");
    if (folderParts.length > 0) {
      currentFolderId = folderParts[folderParts.length - 1];
    }
  }

  if (!currentFolderId) {
    return {
      user,
      currentFolderId,
      currentFolder: Promise.resolve(null),
      breadcrumbs: Promise.resolve([]),
      items: Promise.resolve([]),
    };
  }

  const currentFolderPromise = getCurrentFolder(currentFolderId, user.id);

  const breadcrumbsPromise = getBreadcrumbs(currentFolderId, user.id);

  const currentFolderItemsPromise = currentFolderId
    ? db
        .select()
        .from(table.folder)
        .where(
          and(
            eq(table.folder.ownerId, user.id),
            eq(table.folder.parentId, currentFolderId)
          )
        )
        .orderBy(table.folder.name)
    : Promise.resolve([]);

  const currentFolderFilesPromise = currentFolderId
    ? db
        .select()
        .from(table.file)
        .where(
          and(
            eq(table.file.ownerId, user.id),
            eq(table.file.folderId, currentFolderId)
          )
        )
        .orderBy(table.file.name)
    : Promise.resolve([]);

  const itemsPromise = currentFolderId
    ? Promise.all([currentFolderItemsPromise, currentFolderFilesPromise]).then(
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
      )
    : Promise.resolve([]);

  return {
    user,
    currentFolderId,
    currentFolder: currentFolderPromise,
    breadcrumbs: breadcrumbsPromise,
    items: itemsPromise,
  };
};

async function getBreadcrumbs(
  folderId: string,
  userId: string
): Promise<Array<{ id: string; name: string }>> {
  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.id, folderId), eq(table.folder.ownerId, userId))
    );

  if (!folder) {
    return [];
  }

  const allFolders = await db
    .select()
    .from(table.folder)
    .where(eq(table.folder.ownerId, userId));

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

  return tempBreadcrumbs;
}

async function getCurrentFolder(
  folderId: string,
  userId: string
): Promise<{
  id: string;
  name: string;
  type: "folder";
  ownerId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.id, folderId), eq(table.folder.ownerId, userId))
    );

  if (!folder) {
    return null;
  }

  return { ...folder, type: "folder" as const };
}
