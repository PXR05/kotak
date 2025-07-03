import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

async function ensureRootFolder(userId: string) {
  // Check if user has a root folder
  let [rootFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.ownerId, userId), eq(table.folder.name, "__root__"))
    );

  // Create root folder if it doesn't exist
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

  // Validate name length and characters
  if (trimmedName.length > 255) {
    throw error(400, "Name is too long (maximum 255 characters)");
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    throw error(400, "Name contains invalid characters");
  }

  // Check for reserved names
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(trimmedName)) {
    throw error(400, "This name is reserved and cannot be used");
  }

  // Check for leading/trailing spaces or dots
  if (name !== name.trim()) {
    throw error(400, "Name cannot start or end with spaces");
  }

  if (trimmedName.endsWith(".")) {
    throw error(400, "Name cannot end with a dot");
  }

  let actualParentId = parentId;

  // If no parentId provided, use root folder
  if (!actualParentId) {
    const rootFolder = await ensureRootFolder(locals.user.id);
    actualParentId = rootFolder.id;
  }

  // Verify parent folder exists and belongs to user
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

  // Check if a folder with the same name already exists in the parent folder
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

  // Create the folder
  const [newFolder] = await db
    .insert(table.folder)
    .values({
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      ownerId: locals.user.id,
      parentId: actualParentId,
    })
    .returning();

  return json(newFolder, { status: 201 });
};
