import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder } from "$lib/server/folderUtils";
import { validateName } from "$lib/validation";
import { and, eq } from "drizzle-orm";
import { getContext } from "telefunc";

export async function onRenameFile(options: {
  fileId: string;
  newName: string;
  skipConflicts?: boolean;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { fileId, newName, skipConflicts = false } = options;

  const nameError = validateName(newName.trim());
  if (nameError !== "") {
    return {
      error: nameError,
    };
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(and(eq(table.file.id, fileId), eq(table.file.ownerId, user.id)));

  if (!file) {
    return {
      error: "File not found or access denied",
    };
  }

  const trimmedName = newName.trim();

  const [existingFile] = await db
    .select()
    .from(table.file)
    .where(
      and(
        eq(table.file.folderId, file.folderId),
        eq(table.file.name, trimmedName),
        eq(table.file.ownerId, user.id)
      )
    );

  if (existingFile && existingFile.id !== file.id) {
    if (skipConflicts) {
      return {
        data: file,
      };
    } else {
      return {
        error: "A file with this name already exists in this folder",
      };
    }
  }

  const [updatedFile] = await db
    .update(table.file)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(table.file.id, file.id))
    .returning();

  return {
    data: updatedFile,
  };
}

export async function onMoveFile(options: {
  fileId: string;
  targetFolderId: string | null;
  skipConflicts?: boolean;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { fileId, targetFolderId, skipConflicts = false } = options;

  const [file] = await db
    .select()
    .from(table.file)
    .where(and(eq(table.file.id, fileId), eq(table.file.ownerId, user.id)));

  if (!file) {
    return {
      error: "File not found or access denied",
    };
  }

  let resolvedTargetFolderId: string;

  if (targetFolderId === null) {
    const rootFolder = await ensureRootFolder(user.id);
    resolvedTargetFolderId = rootFolder.id;
  } else {
    const [targetFolder] = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.id, targetFolderId),
          eq(table.folder.ownerId, user.id)
        )
      );

    if (!targetFolder) {
      return {
        error: "Target folder not found or access denied",
      };
    }
    resolvedTargetFolderId = targetFolderId;
  }

  const [existingFile] = await db
    .select()
    .from(table.file)
    .where(
      and(
        eq(table.file.folderId, resolvedTargetFolderId),
        eq(table.file.name, file.name),
        eq(table.file.ownerId, user.id)
      )
    );

  if (existingFile && existingFile.id !== file.id) {
    if (skipConflicts) {
      return {
        data: {
          skipped: true,
          item: existingFile,
        },
      };
    } else {
      return {
        error: "A file with this name already exists in the target folder",
      };
    }
  }

  const [updatedFile] = await db
    .update(table.file)
    .set({
      folderId: resolvedTargetFolderId,
      updatedAt: new Date(),
    })
    .where(eq(table.file.id, file.id))
    .returning();

  return {
    data: {
      skipped: false,
      item: updatedFile,
    },
  };
}
