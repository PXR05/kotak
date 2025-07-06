import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteFile } from "$lib/server/storage";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { ensureRootFolder } from "$lib/server/folderUtils";

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

  const { name, parentId, skipConflicts = false } = await request.json();

  if (!name && parentId === undefined) {
    throw error(400, "Either name or parentId must be provided");
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

  if (folder.name === "__root__" || folder.name === "__trash__") {
    throw error(400, "Cannot modify system folders");
  }

  const updateData: {
    name?: string;
    parentId?: string | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (name) {
    const trimmedName = validateFolderName(name);
    const targetParentId = parentId !== undefined ? parentId : folder.parentId;

    const hasConflict = await hasFolderNameConflict(
      trimmedName,
      targetParentId,
      locals.user.id,
      folder.id
    );
    if (hasConflict) {
      if (skipConflicts) {
        return json(
          { skipped: true, reason: "Name conflict", folderName: folder.name },
          { status: 200 }
        );
      } else {
        throw error(
          409,
          "A folder with this name already exists in this location"
        );
      }
    }
    updateData.name = trimmedName;
  }

  if (parentId !== undefined) {
    const targetParentId = await resolveTargetParent(
      parentId,
      locals.user.id,
      folderId
    );

    if (!name) {
      const hasConflict = await hasFolderNameConflict(
        folder.name,
        targetParentId,
        locals.user.id,
        folder.id
      );
      if (hasConflict) {
        if (skipConflicts) {
          return json(
            {
              skipped: true,
              reason: "Name conflict in target location",
              folderName: folder.name,
            },
            { status: 200 }
          );
        } else {
          throw error(
            409,
            "A folder with this name already exists in the target location"
          );
        }
      }
    }

    updateData.parentId = targetParentId;
  }

  const [updatedFolder] = await db
    .update(table.folder)
    .set(updateData)
    .where(eq(table.folder.id, folderId))
    .returning();

  return json({ success: true, folder: updatedFolder });
};

function validateFolderName(name: string): string {
  if (typeof name !== "string") {
    throw error(400, "Invalid name type");
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

  return trimmedName;
}

async function resolveTargetParent(
  parentId: string | null,
  userId: string,
  folderId: string
): Promise<string | null> {
  if (parentId === null) {
    const rootFolder = await ensureRootFolder(userId);
    return rootFolder.id;
  }

  if (parentId === folderId) {
    throw error(400, "Cannot move folder into itself");
  }

  const [targetFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.id, parentId), eq(table.folder.ownerId, userId))
    );

  if (!targetFolder) {
    throw error(404, "Target folder not found or access denied");
  }

  if (targetFolder.parentId === folderId) {
    throw error(400, "Cannot move folder into its own child");
  }

  return parentId;
}

async function hasFolderNameConflict(
  folderName: string,
  parentId: string | null,
  userId: string,
  excludeFolderId?: string
): Promise<boolean> {
  const [existingFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        parentId === null
          ? isNull(table.folder.parentId)
          : eq(table.folder.parentId, parentId),
        eq(table.folder.name, folderName),
        eq(table.folder.ownerId, userId)
      )
    );

  return existingFolder !== undefined && existingFolder.id !== excludeFolderId;
}

async function checkFolderNameConflict(
  folderName: string,
  parentId: string | null,
  userId: string,
  excludeFolderId?: string
): Promise<void> {
  const hasConflict = await hasFolderNameConflict(
    folderName,
    parentId,
    userId,
    excludeFolderId
  );
  if (hasConflict) {
    throw error(409, "A folder with this name already exists in this location");
  }
}

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
