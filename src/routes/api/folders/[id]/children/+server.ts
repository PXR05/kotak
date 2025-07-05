import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const folderId = params.id;
  if (!folderId) {
    throw error(400, "Missing folder ID");
  }

  try {
    // Verify the folder exists and user has access
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

    // Get child folders
    const childFolders = await db
      .select({
        id: table.folder.id,
        name: table.folder.name,
        ownerId: table.folder.ownerId,
        parentId: table.folder.parentId,
        createdAt: table.folder.createdAt,
        updatedAt: table.folder.updatedAt,
      })
      .from(table.folder)
      .where(
        and(
          eq(table.folder.parentId, folderId),
          eq(table.folder.ownerId, locals.user.id)
        )
      )
      .orderBy(table.folder.name);

    // Get child files
    const childFiles = await db
      .select({
        id: table.file.id,
        name: table.file.name,
        ownerId: table.file.ownerId,
        storageKey: table.file.storageKey,
        folderId: table.file.folderId,
        size: table.file.size,
        mimeType: table.file.mimeType,
        createdAt: table.file.createdAt,
        updatedAt: table.file.updatedAt,
      })
      .from(table.file)
      .where(
        and(
          eq(table.file.folderId, folderId),
          eq(table.file.ownerId, locals.user.id)
        )
      )
      .orderBy(table.file.name);

    const children = [
      ...childFolders.map((f) => ({
        ...f,
        type: "folder" as const,
      })),
      ...childFiles.map((f) => ({
        ...f,
        type: "file" as const,
      })),
    ];

    return json(children);
  } catch (err) {
    console.error("Error fetching folder children:", err);
    throw error(500, "Failed to fetch folder children");
  }
};
