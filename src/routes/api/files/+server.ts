import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createFile, copyFile } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureFolderPath, ensureRootFolder } from "$lib/server/folderUtils";

async function generateUniqueFileName(
  name: string,
  folderId: string,
  userId: string
): Promise<string> {
  const [nameWithoutExt, extension] = name.includes(".")
    ? [
        name.substring(0, name.lastIndexOf(".")),
        name.substring(name.lastIndexOf(".")),
      ]
    : [name, ""];

  let uniqueName = name;
  let counter = 1;

  while (true) {
    const [existingFile] = await db
      .select()
      .from(table.file)
      .where(
        and(
          eq(table.file.name, uniqueName),
          eq(table.file.folderId, folderId),
          eq(table.file.ownerId, userId)
        )
      );

    if (!existingFile) return uniqueName;

    uniqueName = `${nameWithoutExt}_copy${
      counter > 1 ? counter : ""
    }${extension}`;
    counter++;
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");

  const contentType = request.headers.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
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

    if (!folder)
      throw error(403, "Forbidden: You don't have access to this folder.");

    const files = formData.getAll("files") as File[];
    const relativePaths = formData.getAll("relativePaths") as string[];

    if (!files || files.length === 0)
      throw error(400, "No files found in form data.");

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i] || file.name;

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
            targetFolderId = await ensureFolderPath(
              pathWithoutFilename,
              folderId,
              locals.user.id
            );
            actualFileName = fileName;
          }

          const uniqueName = await generateUniqueFileName(
            actualFileName,
            targetFolderId,
            locals.user.id
          );
          const fileMetadata = await createFile(file);

          const [dbFile] = await db
            .insert(table.file)
            .values({
              ...fileMetadata,
              name: uniqueName,
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

    return json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles,
    });
  }

  const { name, sourceFileId, operation, folderId } = await request.json();

  if (!name || !sourceFileId)
    throw error(400, "Missing required fields: name and sourceFileId");

  let targetFolderId = folderId;
  if (!targetFolderId) {
    const rootFolder = await ensureRootFolder(locals.user.id);
    targetFolderId = rootFolder.id;
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.id, targetFolderId),
        eq(table.folder.ownerId, locals.user.id)
      )
    );

  if (!folder)
    throw error(403, "Forbidden: You don't have access to this folder.");

  const [sourceFile] = await db
    .select()
    .from(table.file)
    .where(
      and(
        eq(table.file.id, sourceFileId),
        eq(table.file.ownerId, locals.user.id)
      )
    );

  if (!sourceFile) throw error(404, "Source file not found");

  try {
    const uniqueName = await generateUniqueFileName(
      name,
      targetFolderId,
      locals.user.id
    );
    const newStorageKey = await copyFile(sourceFile.storageKey);

    const [newFile] = await db
      .insert(table.file)
      .values({
        id: newStorageKey,
        name: uniqueName,
        storageKey: newStorageKey,
        size: sourceFile.size,
        mimeType: sourceFile.mimeType,
        folderId: targetFolderId,
        ownerId: locals.user.id,
      })
      .returning();

    return json({
      success: true,
      file: newFile,
      message: `File ${operation === "copy" ? "copied" : "moved"} successfully`,
    });
  } catch (err) {
    console.error(`Failed to ${operation} file:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw error(500, `Failed to ${operation} file: ${errorMessage}`);
  }
};
