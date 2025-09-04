import { json, error } from "@sveltejs/kit";
import { createFile } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureFolderPath, ensureRootFolder } from "$lib/server/folderUtils";
import { parseMultipartStream } from "$lib/server/multipart.js";

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

export const POST = async ({ request, locals }) => {
  if (!locals.user) error(401, "Unauthorized");

  const contentType = request.headers.get("content-type");

  if (!contentType?.includes("multipart/form-data"))
    return error(400, "Invalid content type");

  const uploadedFiles = [];

  try {
    const { files, fields } = await parseMultipartStream(request);

    let folderId = fields.get("folderId")?.[0];

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

    if (!folder) error(403, "Forbidden: You don't have access to this folder.");

    const relativePaths = fields.get("relativePaths") || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i] || file.filename;

      try {
        let targetFolderId = folderId;
        let actualFileName = file.filename;

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

        const filePath = `storage/${file.storageKey}`;
        const fileData = await import("node:fs/promises").then((fs) =>
          fs.readFile(filePath)
        );

        const fileMetadata = await createFile(
          file.storageKey,
          file.filename,
          file.mimeType,
          fileData,
          locals.umk || undefined
        );

        const [dbFile] = await db
          .insert(table.file)
          .values({
            ...fileMetadata,
            name: uniqueName,
            updatedAt: new Date(),
            createdAt: new Date(),
            id: fileMetadata.storageKey,
            ownerId: locals.user.id,
            folderId: targetFolderId,
            encryptedDek: fileMetadata.encryptedDek,
          })
          .returning();

        uploadedFiles.push(dbFile);
      } catch (err) {
        console.error(`Failed to process file ${file.filename}:`, err);
      }
    }

    return json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles,
    });
  } catch (err) {
    console.error("Upload error:", err);
    error(500, "Failed to process upload");
  }
};
