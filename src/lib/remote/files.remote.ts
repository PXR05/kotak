import { command, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder } from "$lib/server/folderUtils";
import { nameSchema } from "$lib/validation";
import { and, eq } from "drizzle-orm";
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
    fileId: z.string(),
    targetFolderId: z.nullable(z.string()),
  }),
  async ({ fileId, targetFolderId }) => {
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
      return {
        data: {
          skipped: true,
          item: existingFile,
        },
      };
    }

    const [updatedFile] = await db
      .update(table.file)
      .set({
        folderId: resolvedTargetFolderId,
        updatedAt: new Date(),
      })
      .where(eq(table.file.id, file.id))
      .returning();

    if (file.folderId.startsWith("root-")) {
      await Promise.all([
        await getRootItems().refresh(),
        await getFolderChildren(resolvedTargetFolderId).refresh(),
      ]);   
    } else if (resolvedTargetFolderId.startsWith("root-")) {
      await Promise.all([
        await getFolderChildren(file.folderId).refresh(),
        await getRootItems().refresh(),
      ]);
    } else {
      await Promise.all([
        await getFolderChildren(file.folderId).refresh(),
        await getFolderChildren(resolvedTargetFolderId).refresh(),
      ]);
    }

    return {
      data: {
        skipped: false,
        item: updatedFile,
      },
    };
  }
);
