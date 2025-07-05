import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export async function ensureRootFolder(userId: string) {
  let [rootFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.ownerId, userId), eq(table.folder.name, "__root__"))
    );

  if (!rootFolder) {
    [rootFolder] = await db
      .insert(table.folder)
      .values({
        id: `root-${userId}`,
        name: "__root__",
        ownerId: userId,
        parentId: null,
      })
      .returning();
  }

  return rootFolder;
}

export async function ensureTrashFolder(userId: string) {
  let [trashFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.ownerId, userId), eq(table.folder.name, "__trash__"))
    );

  if (!trashFolder) {
    [trashFolder] = await db
      .insert(table.folder)
      .values({
        id: `trash-${userId}`,
        name: "__trash__",
        ownerId: userId,
        parentId: null,
      })
      .returning();
  }

  return trashFolder;
}

export async function ensureFolderPath(
  relativePath: string,
  parentFolderId: string,
  userId: string
): Promise<string> {
  const pathParts = relativePath
    .split("/")
    .filter((part) => part.trim() !== "");
  let currentFolderId = parentFolderId;

  for (const folderName of pathParts) {
    let [existingFolder] = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, userId),
          eq(table.folder.parentId, currentFolderId),
          eq(table.folder.name, folderName)
        )
      );

    if (!existingFolder) {
      [existingFolder] = await db
        .insert(table.folder)
        .values({
          id: `folder-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          name: folderName,
          ownerId: userId,
          parentId: currentFolderId,
        })
        .returning();
    }

    currentFolderId = existingFolder.id;
  }

  return currentFolderId;
}
