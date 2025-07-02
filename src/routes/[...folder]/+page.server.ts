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

  // Parse folder parameter to get current folder ID
  if (folder && folder.trim() !== "") {
    // Assuming the folder param contains the folder ID
    // You might need to adjust this parsing logic based on your URL structure
    const folderParts = folder.split("/").filter((part) => part.trim() !== "");
    if (folderParts.length > 0) {
      currentFolderId = folderParts[folderParts.length - 1]; // Get the last part as folder ID
    }
  }

  let folders: any[] = [];
  let files: FileItem[] = [];
  let currentFolder = null;

  if (!currentFolderId) {
    // Get the user's root folder first
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
      // Fetch folders that have the root folder as parent (uploaded folders)
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

      // Also fetch folders with parentId null (legacy root folders)
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

      // Combine both types of root folders
      folders = [...rootLevelFolders, ...legacyRootFolders];

      // Fetch files in the root directory (files in the __root__ folder)
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
    // Verify the folder exists and belongs to the user
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
      redirect(302, "/"); // Redirect to root if folder doesn't exist or doesn't belong to user
    }

    currentFolder = folder;

    // Fetch subfolders of the current folder
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

    // Fetch files in the current folder
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

  // Build breadcrumb path for navigation
  let breadcrumbs: Array<{ id: string; name: string }> = [];
  if (currentFolder) {
    // Build the path from current folder to root
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

  // Combine folders and files into a single array
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
