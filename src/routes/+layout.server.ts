import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getStorageStatus } from "$lib/server/storage";
import type { FileItem } from "$lib/types/file.js";

export const load = async ({ locals }) => {
  const { user } = locals;

  if (!user) {
    return {
      user: locals.user,
      session: locals.session,
      rootItems: Promise.resolve([]),
    };
  }

  const [rootFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.ownerId, user.id), eq(table.folder.name, "__root__"))
    );

  if (!rootFolder) {
    return {
      user: locals.user,
      session: locals.session,
      rootItems: Promise.resolve([]),
    };
  }

  const rootFoldersPromise = db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.ownerId, user.id),
        eq(table.folder.parentId, rootFolder.id)
      )
    )
    .orderBy(table.folder.name);

  const rootFilesPromise = db
    .select()
    .from(table.file)
    .where(
      and(
        eq(table.file.ownerId, user.id),
        eq(table.file.folderId, rootFolder.id)
      )
    )
    .orderBy(table.file.name);

  const rootItemsPromise: Promise<FileItem[]> = Promise.all([
    rootFoldersPromise,
    rootFilesPromise,
  ]).then(([rootFolders, rootFiles]) => {
    const transformedRootFiles = rootFiles.map((file) => ({
      ...file,
      type: "file" as const,
    }));

    return [
      ...rootFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        type: "folder" as const,
        ownerId: folder.ownerId,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      })),
      ...transformedRootFiles.map((file) => ({
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
  });

  return {
    timestamp: Date.now(),
    user: locals.user,
    session: locals.session,
    storageStatus: getStorageStatus(locals.user?.id ),
    rootItems: rootItemsPromise,
  };
};
