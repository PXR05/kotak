import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

interface FolderContents {
  files: Array<{
    id: string;
    name: string;
    storageKey: string;
    size: number;
    mimeType: string;
    path: string; // Relative path within the folder
  }>;
  folders: Array<{
    id: string;
    name: string;
    path: string; // Relative path within the folder
    contents: FolderContents;
  }>;
}

async function getFolderContentsRecursive(
  folderId: string,
  ownerId: string,
  basePath: string = ""
): Promise<FolderContents> {
  // Get all files in this folder
  const files = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.folderId, folderId), eq(table.file.ownerId, ownerId))
    )
    .orderBy(table.file.name);

  // Get all subfolders in this folder
  const subfolders = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.parentId, folderId),
        eq(table.folder.ownerId, ownerId)
      )
    )
    .orderBy(table.folder.name);

  // Recursively get contents of subfolders
  const foldersWithContents = await Promise.all(
    subfolders.map(async (subfolder) => {
      const subfolderPath = basePath
        ? `${basePath}/${subfolder.name}`
        : subfolder.name;
      const contents = await getFolderContentsRecursive(
        subfolder.id,
        ownerId,
        subfolderPath
      );
      return {
        id: subfolder.id,
        name: subfolder.name,
        path: subfolderPath,
        contents,
      };
    })
  );

  return {
    files: files.map((file) => ({
      id: file.id,
      name: file.name,
      storageKey: file.storageKey,
      size: file.size,
      mimeType: file.mimeType,
      path: basePath ? `${basePath}/${file.name}` : file.name,
    })),
    folders: foldersWithContents,
  };
}

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const folderId = params.id;
  if (!folderId) {
    throw error(400, "Missing folder ID");
  }

  // Verify the folder exists and belongs to the user
  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.id, folderId),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (!folder) {
    throw error(404, "Folder not found or access denied");
  }

  try {
    const contents = await getFolderContentsRecursive(folderId, locals.user.id);
    return json(contents);
  } catch (err) {
    console.error("Error fetching folder contents:", err);
    throw error(500, "Failed to fetch folder contents");
  }
};
