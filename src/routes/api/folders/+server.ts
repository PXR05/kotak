import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { ensureRootFolder, ensureTrashFolder } from "$lib/server/folderUtils";

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const getTrash = url.searchParams.get("getTrash");
  if (getTrash === "true") {
    try {
      const trashFolder = await ensureTrashFolder(locals.user.id);
      return json({
        id: trashFolder.id,
        name: trashFolder.name,
        type: "folder" as const,
        ownerId: trashFolder.ownerId,
        parentId: trashFolder.parentId,
        createdAt: trashFolder.createdAt,
        updatedAt: trashFolder.updatedAt,
      });
    } catch (err) {
      console.error("Error ensuring trash folder:", err);
      throw error(500, "Failed to get trash folder");
    }
  }

  try {
    const folders = await db
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
          eq(table.folder.ownerId, locals.user.id),
          ne(table.folder.name, "__root__"),
          ne(table.folder.name, "__trash__")
        )
      )
      .orderBy(table.folder.name);

    const transformedFolders = folders.map((folder) => ({
      ...folder,
      type: "folder" as const,
    }));

    return json(transformedFolders);
  } catch (err) {
    console.error("Error fetching folders:", err);
    throw error(500, "Failed to fetch folders");
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const { name, parentId } = await request.json();

  if (!name || typeof name !== "string") {
    throw error(400, "Invalid or missing folder name");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw error(400, "Folder name cannot be empty");
  }

  if (trimmedName.length > 255) {
    throw error(400, "Name is too long (maximum 255 characters)");
  }

  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    throw error(400, "Name contains invalid characters");
  }

  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(trimmedName)) {
    throw error(400, "This name is reserved and cannot be used");
  }

  if (name !== name.trim()) {
    throw error(400, "Name cannot start or end with spaces");
  }

  if (trimmedName.endsWith(".")) {
    throw error(400, "Name cannot end with a dot");
  }

  let actualParentId = parentId;

  if (!actualParentId) {
    const rootFolder = await ensureRootFolder(locals.user.id);
    actualParentId = rootFolder.id;
  }

  const [parentFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.id, actualParentId),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (!parentFolder) {
    throw error(404, "Parent folder not found or access denied");
  }

  const [existingFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.parentId, actualParentId),
        eq(table.folder.name, trimmedName),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (existingFolder) {
    throw error(409, "A folder with this name already exists in this location");
  }

  const [newFolder] = await db
    .insert(table.folder)
    .values({
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      ownerId: locals.user.id,
      parentId: actualParentId,
    })
    .returning();

  return json(newFolder, { status: 201 });
};
