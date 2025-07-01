import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createFile, deleteFile, getFileStream } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const folderId = formData.get("folderId") as string;

  if (!file) {
    throw error(400, "No file found in form data.");
  }
  if (!folderId) {
    throw error(400, "No folderId found in form data.");
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
    throw error(403, "Forbidden: You don't have access to this folder.");
  }

  const fileMetadata = await createFile(file);
  const [dbFile] = await db
    .insert(table.file)
    .values({
      ...fileMetadata,
      id: fileMetadata.storageKey,
      ownerId: locals.user.id,
      folderId,
    })
    .returning();

  return json(dbFile, { status: 201 });
};

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const storageKey = url.searchParams.get("key");
  if (!storageKey) {
    throw error(400, "Missing storage key");
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(eq(table.file.storageKey, storageKey));

  if (!file) {
    throw error(404, "File not found");
  }
  if (file.ownerId !== locals.user.id) {
    throw error(403, "Forbidden");
  }

  try {
    const fileStream = getFileStream(storageKey);
    return new Response(fileStream, {
      headers: {
        "Content-Type": file.mimeType,
      },
    });
  } catch (err) {
    console.error(err);
    throw error(404, "File not found");
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const storageKey = url.searchParams.get("key");
  if (!storageKey) {
    throw error(400, "Missing storage key");
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(eq(table.file.storageKey, storageKey));

  if (file && file.ownerId !== locals.user.id) {
    throw error(403, "Forbidden");
  }

  await deleteFile(storageKey);

  if (file) {
    await db.delete(table.file).where(eq(table.file.storageKey, storageKey));
  }

  return new Response(null, { status: 204 });
};
