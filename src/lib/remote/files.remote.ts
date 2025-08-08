import { command, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder } from "$lib/server/folderUtils";
import { nameSchema } from "$lib/validation";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/mini";
import { getRootItems } from "./load.remote";
import { getFolderChildren } from "./folders.remote";

export const renameFile = command(
  z.object({
    fileId: z.string(),
    newName: nameSchema,
  }),
  async ({ fileId, newName }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
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
      return {
        error: "A file with this name already exists in this folder",
      };
    }

    const [updatedFile] = await db
      .update(table.file)
      .set({
        name: trimmedName,
        updatedAt: new Date(),
      })
      .where(eq(table.file.id, file.id))
      .returning();

    if (file.folderId.startsWith("root-")) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(file.folderId).refresh();
    }

    return {
      data: updatedFile,
    };
  }
);

export const moveFile = command(
  z.object({
    fileIds: z.array(z.string()),
    targetFolderId: z.nullable(z.string()),
  }),
  async ({ fileIds, targetFolderId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!fileIds || fileIds.length === 0) {
      return {
        error: "No files provided",
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

    const filesToMove = await db
      .select()
      .from(table.file)
      .where(
        and(eq(table.file.ownerId, user.id), inArray(table.file.id, fileIds))
      );

    if (filesToMove.length !== fileIds.length) {
      return {
        error: "One or more files not found or access denied",
      };
    }

    const results: Array<{ skipped: boolean; item: any }> = [];
    const affectedSourceFolderIds = new Set<string>();

    for (const file of filesToMove) {
      const [conflict] = await db
        .select()
        .from(table.file)
        .where(
          and(
            eq(table.file.folderId, resolvedTargetFolderId),
            eq(table.file.name, file.name),
            eq(table.file.ownerId, user.id)
          )
        );

      if (conflict && conflict.id !== file.id) {
        results.push({ skipped: true, item: conflict });
        continue;
      }

      const [updated] = await db
        .update(table.file)
        .set({
          folderId: resolvedTargetFolderId,
          updatedAt: new Date(),
        })
        .where(eq(table.file.id, file.id))
        .returning();

      results.push({ skipped: false, item: updated });
      affectedSourceFolderIds.add(file.folderId);
    }

    const refreshPromises: Array<Promise<unknown>> = [];
    const targetIsRoot = resolvedTargetFolderId.startsWith("root-");

    for (const sourceFolderId of affectedSourceFolderIds) {
      if (sourceFolderId.startsWith("root-")) {
        refreshPromises.push(getRootItems().refresh());
      } else {
        refreshPromises.push(getFolderChildren(sourceFolderId).refresh());
      }
    }

    if (targetIsRoot) {
      refreshPromises.push(getRootItems().refresh());
    } else {
      refreshPromises.push(getFolderChildren(resolvedTargetFolderId).refresh());
    }

    await Promise.all(refreshPromises);

    return {
      data: {
        results,
      },
    };
  }
);
