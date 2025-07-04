import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const fileId = params.id;
  if (!fileId) {
    throw error(400, "Missing file ID");
  }

  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    throw error(400, "Invalid or missing name");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw error(400, "Name cannot be empty");
  }

  // Basic validation (can be enhanced)
  if (trimmedName.length > 255) {
    throw error(400, "Name is too long");
  }

  // Check if file exists and belongs to user
  const [file] = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.id, fileId), eq(table.file.ownerId, locals.user.id))
    );

  if (!file) {
    throw error(404, "File not found or access denied");
  }

  // Check for name conflict in the same folder
  const [existingFile] = await db
    .select()
    .from(table.file)
    .where(
      and(
        eq(table.file.folderId, file.folderId),
        eq(table.file.name, trimmedName),
        eq(table.file.ownerId, locals.user.id)
      )
    );

  if (existingFile && existingFile.id !== fileId) {
    throw error(409, "A file with this name already exists in this folder");
  }

  // Update the file name
  const [updatedFile] = await db
    .update(table.file)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(table.file.id, fileId))
    .returning();

  return json(updatedFile);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const fileId = params.id;
  if (!fileId) {
    throw error(400, "Missing file ID");
  }

  // Check if file exists and belongs to user
  const [file] = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.id, fileId), eq(table.file.ownerId, locals.user.id))
    );

  if (!file) {
    throw error(404, "File not found or access denied");
  }

  // Note: This only deletes the database record.
  // The actual file in storage is not deleted here, but should be.
  // This might be handled by a separate process or when a folder is deleted.

  await db.delete(table.file).where(eq(table.file.id, fileId));

  return json({ message: "File deleted successfully" }, { status: 200 });
}; 