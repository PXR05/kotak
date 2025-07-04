import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import type { FileItem } from "$lib/types/file";

export const load: PageServerLoad = async ({
  locals: { user },
  params: { folder },
}) => {
  if (!user) {
    throw redirect(302, "/auth/login");
  }

  let currentFolderId: string | null = null;

  if (folder && folder.trim() !== "") {
    const folderParts = folder.split("/").filter((part) => part.trim() !== "");
    if (folderParts.length > 0) {
      currentFolderId = folderParts[folderParts.length - 1];
    }
  }

  let folders: any[] = [];
  let files: FileItem[] = [];
  let currentFolder = null;

  if (!currentFolderId) {
    const [rootFolder] = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, user.id),
          eq(table.folder.name, "__root__")
        )
      );

    if (rootFolder) {
      const rootLevelFolders = await db
        .select()
        .from(table.folder)
        .where(
          and(
            eq(table.folder.ownerId, user.id),
            eq(table.folder.parentId, rootFolder.id)
          )
        )
        .orderBy(table.folder.name);

      const legacyRootFolders = await db
        .select()
        .from(table.folder)
        .where(
          and(
            eq(table.folder.ownerId, user.id),
            isNull(table.folder.parentId),
            ne(table.folder.name, "__root__")
          )
        )
        .orderBy(table.folder.name);

      folders = [...rootLevelFolders, ...legacyRootFolders];

      files = (
        await db
          .select()
          .from(table.file)
          .where(
            and(
              eq(table.file.ownerId, user.id),
              eq(table.file.folderId, rootFolder.id)
            )
          )
          .orderBy(table.file.name)
      ).map((file) => ({
        ...file,
        type: "file" as const,
      }));
    }
  } else {
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

    currentFolder = folder;

    folders = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, user.id),
          eq(table.folder.parentId, currentFolderId)
        )
      )
      .orderBy(table.folder.name);

    files = (
      await db
        .select()
        .from(table.file)
        .where(
          and(
            eq(table.file.ownerId, user.id),
            eq(table.file.folderId, currentFolderId)
          )
        )
        .orderBy(table.file.name)
    ).map((file) => ({
      ...file,
      type: "file" as const,
    }));
  }

  let breadcrumbs: Array<{ id: string; name: string }> = [];
  if (currentFolder) {
    let folder = currentFolder;
    const tempBreadcrumbs: Array<{ id: string; name: string }> = [];

    while (folder && folder.name !== "__root__") {
      tempBreadcrumbs.unshift({ id: folder.id, name: folder.name });

      if (folder.parentId) {
        const [parentFolder] = await db
          .select()
          .from(table.folder)
          .where(
            and(
              eq(table.folder.id, folder.parentId),
              eq(table.folder.ownerId, user.id)
            )
          );
        folder = parentFolder || null;
      } else {
        break;
      }
    }

    breadcrumbs = tempBreadcrumbs;
  }

  const items = [
    ...folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: "folder" as const,
      ownerId: folder.ownerId,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    })),
    ...files.map((file) => ({
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

  console.log(`Load function - Current folder: ${currentFolderId || "root"}`);
  console.log(`  Found ${folders.length} folders and ${files.length} files`);
  console.log(`  Total items: ${items.length}`);
  if (folders.length > 0) {
    console.log(`  Folders: ${folders.map((f) => f.name).join(", ")}`);
  }

  return {
    user,
    items,
    currentFolder,
    currentFolderId,
    breadcrumbs,
  };
};
