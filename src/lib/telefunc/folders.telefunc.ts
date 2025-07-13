import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder } from "$lib/server/folderUtils";
import { validateName } from "$lib/validation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getContext } from "telefunc";

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
