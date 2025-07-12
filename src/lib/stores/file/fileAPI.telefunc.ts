import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder, ensureTrashFolder } from "$lib/server/folderUtils";
import { validateName } from "$lib/validation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getContext } from "telefunc";
import { nanoid } from "nanoid";

export interface MoveItemResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  itemName: string;
}

export interface ShareItemOptions {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
}

export interface ShareResult {
  success: boolean;
  shareId: string;
  publicUrl?: string;
  message?: string;
}

export interface ExistingShareData {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
  shareId: string;
}

export async function onGetFolders() {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  try {
    const folders = await db
      .select({
        id: table.folder.id,
        name: table.folder.name,
        ownerId: table.folder.ownerId,
        parentId: table.folder.parentId,
        createdAt: table.folder.createdAt,
        updatedAt: table.folder.updatedAt,
      })
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, user.id),
          ne(table.folder.name, "__root__"),
          ne(table.folder.name, "__trash__")
        )
      )
      .orderBy(table.folder.name);

    const transformedFolders = folders.map((folder) => ({
      ...folder,
      type: "folder" as const,
    }));

    return {
      data: transformedFolders,
    };
  } catch (err) {
    console.error("Error fetching folders:", err);
    return {
      error: "Failed to fetch folders",
    };
  }
}

export async function onGetFolderChildren(options: {
  folderId: string;
  path?: string;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { folderId } = options;

  if (!folderId) {
    return {
      error: "Missing folder ID",
    };
  }

  try {
    const [folder] = await db
      .select()
      .from(table.folder)
      .where(
        and(eq(table.folder.id, folderId), eq(table.folder.ownerId, user.id))
      );

    if (!folder) {
      return {
        error: "Folder not found or access denied",
      };
    }

    const childFolders = await db
      .select({
        id: table.folder.id,
        name: table.folder.name,
        ownerId: table.folder.ownerId,
        parentId: table.folder.parentId,
        createdAt: table.folder.createdAt,
        updatedAt: table.folder.updatedAt,
      })
      .from(table.folder)
      .where(
        and(
          eq(table.folder.parentId, folderId),
          eq(table.folder.ownerId, user.id)
        )
      )
      .orderBy(table.folder.name);

    const childFiles = await db
      .select({
        id: table.file.id,
        name: table.file.name,
        ownerId: table.file.ownerId,
        storageKey: table.file.storageKey,
        folderId: table.file.folderId,
        size: table.file.size,
        mimeType: table.file.mimeType,
        createdAt: table.file.createdAt,
        updatedAt: table.file.updatedAt,
      })
      .from(table.file)
      .where(
        and(eq(table.file.folderId, folderId), eq(table.file.ownerId, user.id))
      )
      .orderBy(table.file.name);

    const children = [
      ...childFolders.map((f) => ({
        ...f,
        type: "folder" as const,
      })),
      ...childFiles.map((f) => ({
        ...f,
        type: "file" as const,
      })),
    ];

    return {
      data: children,
    };
  } catch (err) {
    console.error("Error fetching folder children:", err);
    return {
      error: "Failed to fetch folder children",
    };
  }
}

export async function onCreateFolder(options: {
  name: string;
  parentId?: string;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { name, parentId } = options;

  const nameError = validateName(name.trim());
  if (nameError !== "") {
    return {
      error: nameError,
    };
  }

  let actualParentId = parentId;

  if (!actualParentId) {
    const rootFolder = await ensureRootFolder(user.id);
    actualParentId = rootFolder.id;
  }

  const [parentFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.id, actualParentId),
        eq(table.folder.ownerId, user.id)
      )
    );

  if (!parentFolder) {
    return {
      error: "Parent folder not found or access denied",
    };
  }

  const [existingFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        eq(table.folder.parentId, actualParentId),
        eq(table.folder.name, name.trim()),
        eq(table.folder.ownerId, user.id)
      )
    );

  if (existingFolder) {
    return {
      error: "A folder with this name already exists in this location",
    };
  }

  const [newFolder] = await db
    .insert(table.folder)
    .values({
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      ownerId: user.id,
      parentId: actualParentId,
    })
    .returning();

  return {
    data: newFolder,
  };
}

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

  // Check for name conflict in current folder
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

export async function onRenameFolder(options: {
  folderId: string;
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

  const { folderId, newName, skipConflicts = false } = options;

  const nameError = validateName(newName.trim());
  if (nameError !== "") {
    return {
      error: nameError,
    };
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.id, folderId), eq(table.folder.ownerId, user.id))
    );

  if (!folder) {
    return {
      error: "Folder not found or access denied",
    };
  }

  if (folder.name === "__root__" || folder.name === "__trash__") {
    return {
      error: "Cannot modify system folders",
    };
  }

  const trimmedName = newName.trim();

  // Check for name conflict in current location
  const [existingFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        folder.parentId === null
          ? isNull(table.folder.parentId)
          : eq(table.folder.parentId, folder.parentId),
        eq(table.folder.name, trimmedName),
        eq(table.folder.ownerId, user.id)
      )
    );

  if (existingFolder && existingFolder.id !== folder.id) {
    if (skipConflicts) {
      return {
        data: folder,
      };
    } else {
      return {
        error: "A folder with this name already exists in this location",
      };
    }
  }

  const [updatedFolder] = await db
    .update(table.folder)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(table.folder.id, folderId))
    .returning();

  return {
    data: updatedFolder,
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

  // Check for name conflict in target folder
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

export async function onMoveFolder(options: {
  folderId: string;
  targetParentId: string | null;
  skipConflicts?: boolean;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { folderId, targetParentId, skipConflicts = false } = options;

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(
      and(eq(table.folder.id, folderId), eq(table.folder.ownerId, user.id))
    );

  if (!folder) {
    return {
      error: "Folder not found or access denied",
    };
  }

  if (folder.name === "__root__" || folder.name === "__trash__") {
    return {
      error: "Cannot modify system folders",
    };
  }

  let resolvedTargetParentId: string | null;

  if (targetParentId === null) {
    const rootFolder = await ensureRootFolder(user.id);
    resolvedTargetParentId = rootFolder.id;
  } else {
    if (targetParentId === folderId) {
      return {
        error: "Cannot move folder into itself",
      };
    }

    const [targetFolder] = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.id, targetParentId),
          eq(table.folder.ownerId, user.id)
        )
      );

    if (!targetFolder) {
      return {
        error: "Target folder not found or access denied",
      };
    }

    if (targetFolder.parentId === folderId) {
      return {
        error: "Cannot move folder into its own child",
      };
    }

    resolvedTargetParentId = targetParentId;
  }

  // Check for name conflict in target location
  const [existingFolder] = await db
    .select()
    .from(table.folder)
    .where(
      and(
        resolvedTargetParentId === null
          ? isNull(table.folder.parentId)
          : eq(table.folder.parentId, resolvedTargetParentId),
        eq(table.folder.name, folder.name),
        eq(table.folder.ownerId, user.id)
      )
    );

  if (existingFolder && existingFolder.id !== folder.id) {
    if (skipConflicts) {
      return {
        data: {
          skipped: true,
          item: existingFolder,
        },
      };
    } else {
      return {
        error: "A folder with this name already exists in the target location",
      };
    }
  }

  const [updatedFolder] = await db
    .update(table.folder)
    .set({
      parentId: resolvedTargetParentId,
      updatedAt: new Date(),
    })
    .where(eq(table.folder.id, folderId))
    .returning();

  return {
    data: {
      skipped: false,
      item: updatedFolder,
    },
  };
}

export async function onRestoreFile(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing itemId",
    };
  }

  try {
    const [trashedItem] = await db
      .select()
      .from(table.trashedItem)
      .where(
        and(
          eq(table.trashedItem.itemId, itemId),
          eq(table.trashedItem.ownerId, user.id)
        )
      );

    if (!trashedItem) {
      return {
        error: "Trashed item not found",
      };
    }

    if (trashedItem.itemType !== "file") {
      return {
        error: "Item is not a file",
      };
    }

    await db
      .update(table.file)
      .set({
        folderId: trashedItem.originalFolderId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(table.file.id, itemId));

    await db
      .delete(table.trashedItem)
      .where(eq(table.trashedItem.id, trashedItem.id));

    return {
      data: { success: true, message: "File restored successfully" },
    };
  } catch (err) {
    console.error("Error restoring file:", err);
    return {
      error: "Failed to restore file",
    };
  }
}

export async function onRestoreFolder(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing itemId",
    };
  }

  try {
    const [trashedItem] = await db
      .select()
      .from(table.trashedItem)
      .where(
        and(
          eq(table.trashedItem.itemId, itemId),
          eq(table.trashedItem.ownerId, user.id)
        )
      );

    if (!trashedItem) {
      return {
        error: "Trashed item not found",
      };
    }

    if (trashedItem.itemType !== "folder") {
      return {
        error: "Item is not a folder",
      };
    }

    await db
      .update(table.folder)
      .set({
        parentId: trashedItem.originalParentId,
        updatedAt: new Date(),
      })
      .where(eq(table.folder.id, itemId));

    await db
      .delete(table.trashedItem)
      .where(eq(table.trashedItem.id, trashedItem.id));

    return {
      data: { success: true, message: "Folder restored successfully" },
    };
  } catch (err) {
    console.error("Error restoring folder:", err);
    return {
      error: "Failed to restore folder",
    };
  }
}

export async function onTrashItem(options: {
  itemId: string;
  itemType: "file" | "folder";
  originalFolderId?: string | null;
  originalParentId?: string | null;
  name: string;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId, itemType, originalFolderId, originalParentId, name } =
    options;

  if (!itemId || !itemType || !name) {
    return {
      error: "Missing required fields: itemId, itemType, or name",
    };
  }

  if (itemType !== "file" && itemType !== "folder") {
    return {
      error: "Invalid itemType, must be 'file' or 'folder'",
    };
  }

  try {
    const [trashRecord] = await db
      .insert(table.trashedItem)
      .values({
        id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        itemId,
        itemType,
        originalFolderId: originalFolderId || null,
        originalParentId: originalParentId || null,
        ownerId: user.id,
        trashedAt: new Date(),
        name,
      })
      .returning();

    if (trashRecord) {
      if (itemType === "file") {
        await db
          .update(table.file)
          .set({
            folderId: (await ensureTrashFolder(user.id)).id,
            updatedAt: new Date(),
          })
          .where(eq(table.file.id, itemId));
      } else if (itemType === "folder") {
        await db
          .update(table.folder)
          .set({
            parentId: (await ensureTrashFolder(user.id)).id,
            updatedAt: new Date(),
          })
          .where(eq(table.folder.id, itemId));
      }
    }

    return {
      data: trashRecord,
    };
  } catch (err) {
    console.error("Error recording trashed item:", err);
    return {
      error: "Failed to record trashed item",
    };
  }
}

export async function onPermanentDeleteFile(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing itemId",
    };
  }

  try {
    const [trashedItem] = await db
      .select()
      .from(table.trashedItem)
      .where(
        and(
          eq(table.trashedItem.itemId, itemId),
          eq(table.trashedItem.ownerId, user.id)
        )
      );

    if (!trashedItem) {
      return {
        error: "Trashed item not found",
      };
    }

    if (trashedItem.itemType !== "file") {
      return {
        error: "Item is not a file",
      };
    }

    await db.delete(table.file).where(eq(table.file.id, itemId));

    await db
      .delete(table.trashedItem)
      .where(eq(table.trashedItem.id, trashedItem.id));

    return {
      data: { success: true, message: "File permanently deleted" },
    };
  } catch (err) {
    console.error("Error permanently deleting file:", err);
    return {
      error: "Failed to permanently delete file",
    };
  }
}

export async function onPermanentDeleteFolder(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing itemId",
    };
  }

  try {
    const [trashedItem] = await db
      .select()
      .from(table.trashedItem)
      .where(
        and(
          eq(table.trashedItem.itemId, itemId),
          eq(table.trashedItem.ownerId, user.id)
        )
      );

    if (!trashedItem) {
      return {
        error: "Trashed item not found",
      };
    }

    if (trashedItem.itemType !== "folder") {
      return {
        error: "Item is not a folder",
      };
    }

    await db.delete(table.folder).where(eq(table.folder.id, itemId));

    await db
      .delete(table.trashedItem)
      .where(eq(table.trashedItem.id, trashedItem.id));

    return {
      data: { success: true, message: "Folder permanently deleted" },
    };
  } catch (err) {
    console.error("Error permanently deleting folder:", err);
    return {
      error: "Failed to permanently delete folder",
    };
  }
}

export async function onEmptyTrash() {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  try {
    const trashedItems = await db
      .select()
      .from(table.trashedItem)
      .where(eq(table.trashedItem.ownerId, user.id));

    for (const trashedItem of trashedItems) {
      if (trashedItem.itemType === "file") {
        await db
          .delete(table.file)
          .where(eq(table.file.id, trashedItem.itemId));
      } else if (trashedItem.itemType === "folder") {
        await db
          .delete(table.folder)
          .where(eq(table.folder.id, trashedItem.itemId));
      }
    }

    await db
      .delete(table.trashedItem)
      .where(eq(table.trashedItem.ownerId, user.id));

    return {
      data: { success: true, message: "Trash emptied successfully" },
    };
  } catch (err) {
    console.error("Error emptying trash:", err);
    return {
      error: "Failed to empty trash",
    };
  }
}

export async function onShareFile(options: {
  itemId: string;
  isPublic: boolean;
  emails: string[];
  expiresAt?: Date | null;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId, isPublic, emails, expiresAt } = options;

  if (!itemId) {
    return {
      error: "Missing file ID",
    };
  }

  if (typeof isPublic !== "boolean") {
    return {
      error: "isPublic must be a boolean",
    };
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.storageKey, itemId), eq(table.file.ownerId, user.id))
    );

  if (!file) {
    return {
      error: "File not found or access denied",
    };
  }

  try {
    const [existingShare] = await db
      .select()
      .from(table.fileShare)
      .where(
        and(
          eq(table.fileShare.fileId, file.id),
          eq(table.fileShare.sharedBy, user.id)
        )
      );

    const expirationDate = expiresAt ? new Date(expiresAt) : null;
    let shareId: string;

    if (existingShare) {
      shareId = existingShare.id;
      await db
        .update(table.fileShare)
        .set({
          isPublic,
          expiresAt: expirationDate,
        })
        .where(eq(table.fileShare.id, shareId));

      await db
        .delete(table.fileShareRecipient)
        .where(eq(table.fileShareRecipient.shareId, shareId));
    } else {
      shareId = nanoid();
      await db.insert(table.fileShare).values({
        id: shareId,
        fileId: file.id,
        sharedBy: user.id,
        permissions: "read",
        isPublic,
        expiresAt: expirationDate,
      });
    }

    if (!isPublic && emails && Array.isArray(emails) && emails.length > 0) {
      const recipients = emails.map((email: string) => ({
        id: nanoid(),
        shareId,
        email: email.trim().toLowerCase(),
      }));

      await db.insert(table.fileShareRecipient).values(recipients);
    }

    const publicUrl = isPublic ? `/shared/files/${shareId}` : undefined;

    return {
      data: {
        success: true,
        shareId,
        publicUrl,
        message: existingShare
          ? "File sharing updated successfully"
          : "File shared successfully",
      },
    };
  } catch (err) {
    console.error("Error sharing file:", err);
    return {
      error: "Failed to share file",
    };
  }
}

export async function onShareFolder(options: {
  itemId: string;
  isPublic: boolean;
  emails: string[];
  expiresAt?: Date | null;
}) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId, isPublic, emails, expiresAt } = options;

  if (!itemId) {
    return {
      error: "Missing folder ID",
    };
  }

  if (typeof isPublic !== "boolean") {
    return {
      error: "isPublic must be a boolean",
    };
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(and(eq(table.folder.id, itemId), eq(table.folder.ownerId, user.id)));

  if (!folder) {
    return {
      error: "Folder not found or access denied",
    };
  }

  if (folder.name === "__root__" || folder.name === "__trash__") {
    return {
      error: "Cannot share system folders",
    };
  }

  try {
    const [existingShare] = await db
      .select()
      .from(table.folderShare)
      .where(
        and(
          eq(table.folderShare.folderId, folder.id),
          eq(table.folderShare.sharedBy, user.id)
        )
      );

    const expirationDate = expiresAt ? new Date(expiresAt) : null;
    let shareId: string;

    if (existingShare) {
      shareId = existingShare.id;
      await db
        .update(table.folderShare)
        .set({
          isPublic,
          expiresAt: expirationDate,
        })
        .where(eq(table.folderShare.id, shareId));

      await db
        .delete(table.folderShareRecipient)
        .where(eq(table.folderShareRecipient.shareId, shareId));
    } else {
      shareId = nanoid();
      await db.insert(table.folderShare).values({
        id: shareId,
        folderId: folder.id,
        sharedBy: user.id,
        permissions: "read",
        isPublic,
        expiresAt: expirationDate,
      });
    }

    if (!isPublic && emails && Array.isArray(emails) && emails.length > 0) {
      const recipients = emails.map((email: string) => ({
        id: nanoid(),
        shareId,
        email: email.trim().toLowerCase(),
      }));

      await db.insert(table.folderShareRecipient).values(recipients);
    }

    const publicUrl = isPublic ? `/shared/folders/${shareId}` : undefined;

    return {
      data: {
        success: true,
        shareId,
        publicUrl,
        message: existingShare
          ? "Folder sharing updated successfully"
          : "Folder shared successfully",
      },
    };
  } catch (err) {
    console.error("Error sharing folder:", err);
    return {
      error: "Failed to share folder",
    };
  }
}

export async function onDeleteFileShare(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing file ID",
    };
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.storageKey, itemId), eq(table.file.ownerId, user.id))
    );

  if (!file) {
    return {
      error: "File not found or access denied",
    };
  }

  try {
    const [existingShare] = await db
      .select()
      .from(table.fileShare)
      .where(
        and(
          eq(table.fileShare.fileId, file.id),
          eq(table.fileShare.sharedBy, user.id)
        )
      );

    if (!existingShare) {
      return {
        error: "No share found to delete",
      };
    }

    await db
      .delete(table.fileShareRecipient)
      .where(eq(table.fileShareRecipient.shareId, existingShare.id));

    await db
      .delete(table.fileShare)
      .where(eq(table.fileShare.id, existingShare.id));

    return {
      data: {
        success: true,
        message: "File share deleted successfully",
      },
    };
  } catch (err) {
    console.error("Failed to delete file share:", err);
    return {
      error: "Failed to delete file share",
    };
  }
}

export async function onDeleteFolderShare(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing folder ID",
    };
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(and(eq(table.folder.id, itemId), eq(table.folder.ownerId, user.id)));

  if (!folder) {
    return {
      error: "Folder not found or access denied",
    };
  }

  if (folder.name === "__root__" || folder.name === "__trash__") {
    return {
      error: "Cannot delete shares for system folders",
    };
  }

  try {
    const [existingShare] = await db
      .select()
      .from(table.folderShare)
      .where(
        and(
          eq(table.folderShare.folderId, folder.id),
          eq(table.folderShare.sharedBy, user.id)
        )
      );

    if (!existingShare) {
      return {
        error: "No share found to delete",
      };
    }

    await db
      .delete(table.folderShareRecipient)
      .where(eq(table.folderShareRecipient.shareId, existingShare.id));

    await db
      .delete(table.folderShare)
      .where(eq(table.folderShare.id, existingShare.id));

    return {
      data: {
        success: true,
        message: "Folder share deleted successfully",
      },
    };
  } catch (err) {
    console.error("Failed to delete folder share:", err);
    return {
      error: "Failed to delete folder share",
    };
  }
}

export async function onGetFileShare(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing file ID",
    };
  }

  const [file] = await db
    .select()
    .from(table.file)
    .where(
      and(eq(table.file.storageKey, itemId), eq(table.file.ownerId, user.id))
    );
  if (!file) {
    return {
      error: "File not found or access denied",
    };
  }

  const [existingShare] = await db
    .select()
    .from(table.fileShare)
    .where(
      and(
        eq(table.fileShare.fileId, file.id),
        eq(table.fileShare.sharedBy, user.id)
      )
    );

  if (!existingShare) {
    return {
      data: undefined,
    };
  }

  const recipients = await db
    .select()
    .from(table.fileShareRecipient)
    .where(eq(table.fileShareRecipient.shareId, existingShare.id));

  return {
    data: {
      shareId: existingShare.id,
      isPublic: existingShare.isPublic,
      emails: recipients.map((r) => r.email),
      expiresAt: existingShare.expiresAt?.toISOString(),
    },
  };
}

export async function onGetFolderShare(options: { itemId: string }) {
  const context = getContext();
  const { user } = context;
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

  const { itemId } = options;

  if (!itemId) {
    return {
      error: "Missing folder ID",
    };
  }

  const [folder] = await db
    .select()
    .from(table.folder)
    .where(and(eq(table.folder.id, itemId), eq(table.folder.ownerId, user.id)));

  if (!folder) {
    return {
      error: "Folder not found or access denied",
    };
  }

  const [existingShare] = await db
    .select()
    .from(table.folderShare)
    .where(
      and(
        eq(table.folderShare.folderId, folder.id),
        eq(table.folderShare.sharedBy, user.id)
      )
    );

  if (!existingShare) {
    return {
      data: undefined,
    };
  }

  const recipients = await db
    .select()
    .from(table.folderShareRecipient)
    .where(eq(table.folderShareRecipient.shareId, existingShare.id));

  return {
    data: {
      shareId: existingShare.id,
      isPublic: existingShare.isPublic,
      emails: recipients.map((r) => r.email),
      expiresAt: existingShare.expiresAt?.toISOString(),
    },
  };
}
