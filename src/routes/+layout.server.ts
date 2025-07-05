import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user } = locals;

  if (!user) {
    return {
      user: locals.user,
      session: locals.session,
      rootItems: Promise.resolve([]),
    };
  }

  // Get root folder
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

  // Create promises for root data
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

  // Create streamed promise for transformed root data
  const rootItemsPromise = Promise.all([
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
    user: locals.user,
    session: locals.session,
    rootItems: rootItemsPromise,
  };
};
