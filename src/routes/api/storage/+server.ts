import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createFile, deleteFile, getFileStream } from "$lib/server/storage";
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
    // Check if folder already exists
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
      // Create the folder
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

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const formData = await request.formData();
  let folderId = formData.get("folderId") as string;

  // If no folderId provided, use root folder
  if (!folderId) {
    const rootFolder = await ensureRootFolder(locals.user.id);
    folderId = rootFolder.id;
  }

  // Verify folder access
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

  // Handle multiple files
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

        // If file has a relative path (from folder upload), ensure folder structure exists
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
            name: actualFileName, // Use the extracted filename, not the original
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
        // Continue with other files, but log the error
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

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const storageKey = url.searchParams.get("key");
  const download = url.searchParams.get("download");

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

    // Determine content disposition based on file type and download parameter
    let contentDisposition = `inline; filename="${file.name}"`;

    // Force download if explicitly requested
    if (download === "true") {
      contentDisposition = `attachment; filename="${file.name}"`;
    }

    const headers: Record<string, string> = {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition,
    };

    // Add CORS headers for iframe embedding
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
