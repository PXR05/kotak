import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createFile, deleteFile, getFileStream } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

async function ensureRootFolder(userId: string) {
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

async function ensureFolderPath(
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
          id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

async function findFileByIdOrStorageKey(fileId: string, userId: string) {
  const UUID_V4_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (UUID_V4_PATTERN.test(fileId)) {
    return (
      (
        await db
          .select()
          .from(table.file)
          .where(
            and(
              eq(table.file.storageKey, fileId),
              eq(table.file.ownerId, userId)
            )
          )
      )[0] ?? null
    );
  }

  return (
    (
      await db
        .select()
        .from(table.file)
        .where(and(eq(table.file.id, fileId), eq(table.file.ownerId, userId)))
    )[0] ?? null
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const formData = await request.formData();
  let folderId = formData.get("folderId") as string;

  if (!folderId) {
    const rootFolder = await ensureRootFolder(locals.user.id);
    folderId = rootFolder.id;
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

  const files = formData.getAll("files") as File[];
  const relativePaths = formData.getAll("relativePaths") as string[];

  console.log(
    `Upload request: ${files.length} files, ${relativePaths.length} paths`
  );

  if (!files || files.length === 0) {
    throw error(400, "No files found in form data.");
  }

  const uploadedFiles = [];
  const createdFolders = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = relativePaths[i] || file.name;

    console.log(`Processing: ${file.name} (${relativePath})`);

    if (file instanceof File && file.size > 0) {
      try {
        let targetFolderId = folderId;
        let actualFileName = file.name;

        if (relativePath && relativePath.includes("/")) {
          const pathWithoutFilename = relativePath.substring(
            0,
            relativePath.lastIndexOf("/")
          );
          const fileName = relativePath.substring(
            relativePath.lastIndexOf("/") + 1
          );

          console.log(`Creating folder path: ${pathWithoutFilename}`);

          targetFolderId = await ensureFolderPath(
            pathWithoutFilename,
            folderId,
            locals.user.id
          );

          actualFileName = fileName;
          createdFolders.add(pathWithoutFilename);
        }

        const fileMetadata = await createFile(file);
        const [dbFile] = await db
          .insert(table.file)
          .values({
            ...fileMetadata,
            name: actualFileName,
            updatedAt: new Date(file.lastModified),
            createdAt: new Date(file.lastModified),
            id: fileMetadata.storageKey,
            ownerId: locals.user.id,
            folderId: targetFolderId,
          })
          .returning();

        uploadedFiles.push(dbFile);
      } catch (err) {
        console.error(`Failed to upload file ${file.name}:`, err);
      }
    }
  }

  console.log(`Upload completed: ${uploadedFiles.length} files uploaded`);
  console.log(
    `Created ${createdFolders.size} folder paths:`,
    Array.from(createdFolders)
  );

  return json(
    {
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles,
    },
    { status: 201 }
  );
};

export const GET: RequestHandler = async ({ params, url, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const fileId = params.id;
  const download = url.searchParams.get("download");

  if (!fileId) {
    throw error(400, "Missing file ID");
  }

  const file = await findFileByIdOrStorageKey(fileId, locals.user.id);

  if (!file) {
    throw error(404, "File not found");
  }

  try {
    const fileStream = getFileStream(file.storageKey);

    let contentDisposition = `inline; filename="${file.name}"`;

    if (download === "true") {
      contentDisposition = `attachment; filename="${file.name}"`;
    }

    const headers: Record<string, string> = {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition,
    };

    if (file.mimeType === "application/pdf") {
      headers["X-Frame-Options"] = "SAMEORIGIN";
      headers["Content-Security-Policy"] = "frame-ancestors 'self'";
    }

    return new Response(fileStream, { headers });
  } catch (err) {
    console.error(err);
    throw error(404, "File not found");
  }
};

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

  if (trimmedName.length > 255) {
    throw error(400, "Name is too long (maximum 255 characters)");
  }

  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    throw error(400, "Name contains invalid characters");
  }

  const file = await findFileByIdOrStorageKey(fileId, locals.user.id);

  if (!file) {
    throw error(404, "File not found or access denied");
  }

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

  if (existingFile && existingFile.id !== file.id) {
    throw error(409, "A file with this name already exists in this folder");
  }

  const [updatedFile] = await db
    .update(table.file)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(table.file.id, file.id))
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

  const file = await findFileByIdOrStorageKey(fileId, locals.user.id);

  if (!file) {
    throw error(404, "File not found or access denied");
  }

  await deleteFile(file.storageKey);

  await db.delete(table.file).where(eq(table.file.id, file.id));

  return json({ message: "File deleted successfully" }, { status: 200 });
};
