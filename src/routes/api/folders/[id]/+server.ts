import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteFile } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";

async function recursivelyDeleteFolder(
  folderId: string,
  ownerId: string
): Promise<void> {
  const files = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.folderId, folderId), eq(table.file.ownerId, ownerId))
    );

  for (const file of files) {
    try {
      await deleteFile(file.storageKey);
      await db.delete(table.file).where(eq(table.file.id, file.id));
      console.log(`Deleted file: ${file.name}`);
    } catch (err) {
      console.error(`Failed to delete file ${file.name}:`, err);
    }
  }

  const childFolders = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.parentId, folderId),
        eq(table.folder.ownerId, ownerId)
      )
    );

  for (const childFolder of childFolders) {
    await recursivelyDeleteFolder(childFolder.id, ownerId);
  }

  await db.delete(table.folder).where(eq(table.folder.id, folderId));
  console.log(`Deleted folder: ${folderId}`);
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const folderId = params.id;
  if (!folderId) {
    throw error(400, "Missing folder ID");
  }

  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    throw error(400, "Invalid or missing name");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw error(400, "Name cannot be empty");
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

  if (folder.name === "__root__") {
    throw error(400, "Cannot rename root folder");
  }

  const [existingFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        folder.parentId === null
          ? isNull(table.folder.parentId)
          : eq(table.folder.parentId, folder.parentId),
        eq(table.folder.name, trimmedName),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (existingFolder && existingFolder.id !== folder.id) {
    throw error(409, "A folder with this name already exists in this location");
  }

  const [updatedFolder] = await db
    .update(table.folder)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(table.folder.id, folderId))
    .returning();

  return json(updatedFolder);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const folderId = params.id;
  if (!folderId) {
    throw error(400, "Missing folder ID");
  }

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

  if (folder.name === "__root__") {
    throw error(400, "Cannot delete root folder");
  }

  try {
    await recursivelyDeleteFolder(folderId, locals.user.id);

    return json(
      { message: "Folder and all contents deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting folder:", err);
    throw error(500, "Failed to delete folder");
  }
};
