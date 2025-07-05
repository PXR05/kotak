import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import * as auth from "$lib/server/auth.js";

export const load: PageServerLoad = async ({
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

  const [rootFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.ownerId, user.id), eq(table.folder.name, "__root__"))
    );

  if (!rootFolder && folder.trim() !== "") {
    redirect(302, "/");
  }

  let currentFolder = null;
  let breadcrumbs: Array<{ id: string; name: string }> = [];

  if (currentFolderId) {
    const [folder] = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.id, currentFolderId),
          eq(table.folder.ownerId, user.id)
        )
      );

    if (!folder) {
      redirect(302, "/");
    }

    currentFolder = { ...folder, type: "folder" as const };

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

    breadcrumbs = tempBreadcrumbs;
  }

  // Create promises for current folder data
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

  // Create streamed promise for current folder items
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
    currentFolder,
    currentFolderId,
    breadcrumbs,
    items: itemsPromise,
  };
};

export const actions = {
  logout: async (event) => {
    const sessionToken = event.cookies.get(auth.sessionCookieName);
    if (sessionToken) {
      const { session } = await auth.validateSessionToken(sessionToken);
      if (session) {
        await auth.invalidateSession(session.id);
      }
    }
    auth.deleteSessionTokenCookie(event);
    redirect(303, "/auth/login");
  },
};
