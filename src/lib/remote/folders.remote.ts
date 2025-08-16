import { command, getRequestEvent, query } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder } from "$lib/server/folderUtils";
import { nameSchema } from "$lib/validation";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import * as z from "zod/mini";
import { getRootItems } from "./load.remote";

export const getFolders = query(async () => {
  const {
    locals: { user },
  } = getRequestEvent();
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
});

export const getFolderChildren = query(z.string(), async (folderId) => {
  const {
    locals: { user },
  } = getRequestEvent();
  if (!user) {
    return {
      error: "User not authenticated",
    };
  }

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
});

export const createFolder = command(
  z.object({
    name: nameSchema,
    parentId: z.optional(z.string()),
  }),
  async ({ name, parentId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!parentId) {
      const rootFolder = await ensureRootFolder(user.id);
      parentId = rootFolder.id;
    }

    let newFolder: any;
    const txErr = await db.transaction(async (tx) => {
      const [parentFolder] = await tx
        .select()
        .from(table.folder)
        .where(
          and(eq(table.folder.id, parentId), eq(table.folder.ownerId, user.id))
        );

      if (!parentFolder) {
        return "Parent folder not found or access denied" as const;
      }

      const [existingFolder] = await tx
        .select()
        .from(table.folder)
        .where(
          and(
            eq(table.folder.parentId, parentId),
            eq(table.folder.name, name.trim()),
            eq(table.folder.ownerId, user.id)
          )
        );

      if (existingFolder) {
        return "A folder with this name already exists in this location" as const;
      }

      [newFolder] = await tx
        .insert(table.folder)
        .values({
          id: `folder-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          name: name.trim(),
          ownerId: user.id,
          parentId: parentId,
        })
        .returning();

      return;
    });

    if (txErr) {
      return { error: txErr };
    }

    if (parentId.startsWith("root-")) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(parentId).refresh();
    }

    return {
      data: newFolder,
    };
  }
);

export const renameFolder = command(
  z.object({
    folderId: z.string(),
    newName: nameSchema,
  }),
  async ({ folderId, newName }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
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

    let updatedFolder: any;
    const txErr = await db.transaction(async (tx) => {
      const [existingFolder] = await tx
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
        return "A folder with this name already exists in this location" as const;
      }

      [updatedFolder] = await tx
        .update(table.folder)
        .set({
          name: trimmedName,
          updatedAt: new Date(),
        })
        .where(eq(table.folder.id, folderId))
        .returning();

      return;
    });

    if (txErr) {
      return { error: txErr };
    }

    if (!folder.parentId) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(folder.parentId).refresh();
    }

    return {
      data: updatedFolder,
    };
  }
);

export const moveFolder = command(
  z.object({
    folderIds: z.array(z.string()),
    targetParentId: z.nullable(z.string()),
  }),
  async ({ folderIds, targetParentId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!folderIds || folderIds.length === 0) {
      return {
        error: "No folders provided",
      };
    }

    let resolvedTargetParentId: string | null;

    if (targetParentId === null) {
      const rootFolder = await ensureRootFolder(user.id);
      resolvedTargetParentId = rootFolder.id;
    } else {
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

      resolvedTargetParentId = targetParentId;
    }

    const foldersToMove = await db
      .select()
      .from(table.folder)
      .where(
        and(
          eq(table.folder.ownerId, user.id),
          inArray(table.folder.id, folderIds)
        )
      );

    if (foldersToMove.length < folderIds.length) {
      return {
        error: "One or more folders not found or access denied",
      };
    }

    const results: Array<{
      skipped: boolean;
      item: any;
      sourceParentId?: string | null;
    }> = [];
    await db.transaction(async (tx) => {
      for (const folder of foldersToMove) {
        if (folder.name === "__root__" || folder.name === "__trash__") {
          results.push({ skipped: true, item: folder });
          continue;
        }

        if (resolvedTargetParentId === folder.id) {
          results.push({ skipped: true, item: folder });
          continue;
        }

        if (resolvedTargetParentId) {
          const [targetFolder] = await tx
            .select()
            .from(table.folder)
            .where(
              and(
                eq(table.folder.id, resolvedTargetParentId),
                eq(table.folder.ownerId, user.id)
              )
            );
          if (targetFolder && targetFolder.parentId === folder.id) {
            results.push({ skipped: true, item: folder });
            continue;
          }
        }

        const [conflict] = await tx
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

        if (conflict && conflict.id !== folder.id) {
          results.push({ skipped: true, item: conflict });
          continue;
        }

        const [updatedFolder] = await tx
          .update(table.folder)
          .set({
            parentId: resolvedTargetParentId,
            updatedAt: new Date(),
          })
          .where(eq(table.folder.id, folder.id))
          .returning();

        results.push({
          skipped: false,
          item: updatedFolder,
          sourceParentId: folder.parentId,
        });
      }
    });

    const refreshPromises: Array<Promise<unknown>> = [];

    const affectedSourceParentIds = new Set<string | null>();
    for (const r of results) {
      if (!r.skipped) affectedSourceParentIds.add(r.sourceParentId ?? null);
    }

    for (const sourceParentId of affectedSourceParentIds) {
      if (!sourceParentId || String(sourceParentId).startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else {
        refreshPromises.push(
          getFolderChildren(String(sourceParentId)).refresh()
        );
      }
    }

    if (!resolvedTargetParentId || resolvedTargetParentId.startsWith("root-")) {
      refreshPromises.push(getRootItems().refresh());
    } else {
      refreshPromises.push(getFolderChildren(resolvedTargetParentId).refresh());
    }

    await Promise.all(refreshPromises);

    return {
      data: {
        results,
      },
    };
  }
);
