import { a } from "../chunks/event-state.js";
import { c } from "../chunks/command.js";
import "@sveltejs/kit";
import { d, a as a$1, f } from "../chunks/schema.js";
import { e } from "../chunks/folderUtils.js";
import { n } from "../chunks/validation.js";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/mini";
import { getRootItems } from "./r29gge.js";
import { getFolderChildren } from "./1039kel.js";
import "../chunks/query.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const renameFile = c(
  z.object({
    fileId: z.string(),
    newName: n
  }),
  async ({ fileId, newName }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    const [file$1] = await d.select().from(a$1).where(and(eq(a$1.id, fileId), eq(a$1.ownerId, user.id)));
    if (!file$1) {
      return {
        error: "File not found or access denied"
      };
    }
    const trimmedName = newName.trim();
    const [existingFile] = await d.select().from(a$1).where(
      and(
        eq(a$1.folderId, file$1.folderId),
        eq(a$1.name, trimmedName),
        eq(a$1.ownerId, user.id)
      )
    );
    if (existingFile && existingFile.id !== file$1.id) {
      return {
        error: "A file with this name already exists in this folder"
      };
    }
    const [updatedFile] = await d.update(a$1).set({
      name: trimmedName,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(a$1.id, file$1.id)).returning();
    if (file$1.folderId.startsWith("root-")) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(file$1.folderId).refresh();
    }
    return {
      data: updatedFile
    };
  }
);
const moveFile = c(
  z.object({
    fileIds: z.array(z.string()),
    targetFolderId: z.nullable(z.string())
  }),
  async ({ fileIds, targetFolderId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!fileIds || fileIds.length === 0) {
      return {
        error: "No files provided"
      };
    }
    let resolvedTargetFolderId;
    if (targetFolderId === null) {
      const rootFolder = await e(user.id);
      resolvedTargetFolderId = rootFolder.id;
    } else {
      const [targetFolder] = await d.select().from(f).where(
        and(
          eq(f.id, targetFolderId),
          eq(f.ownerId, user.id)
        )
      );
      if (!targetFolder) {
        return {
          error: "Target folder not found or access denied"
        };
      }
      resolvedTargetFolderId = targetFolderId;
    }
    const filesToMove = await d.select().from(a$1).where(
      and(eq(a$1.ownerId, user.id), inArray(a$1.id, fileIds))
    );
    if (filesToMove.length !== fileIds.length) {
      return {
        error: "One or more files not found or access denied"
      };
    }
    const results = [];
    const affectedSourceFolderIds = /* @__PURE__ */ new Set();
    for (const file$1 of filesToMove) {
      const [conflict] = await d.select().from(a$1).where(
        and(
          eq(a$1.folderId, resolvedTargetFolderId),
          eq(a$1.name, file$1.name),
          eq(a$1.ownerId, user.id)
        )
      );
      if (conflict && conflict.id !== file$1.id) {
        results.push({ skipped: true, item: conflict });
        continue;
      }
      const [updated] = await d.update(a$1).set({
        folderId: resolvedTargetFolderId,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(a$1.id, file$1.id)).returning();
      results.push({ skipped: false, item: updated });
      affectedSourceFolderIds.add(file$1.folderId);
    }
    const refreshPromises = [];
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
        results
      }
    };
  }
);
for (const [name, fn] of Object.entries({ moveFile, renameFile })) {
  fn.__.id = "11l9kl9/" + name;
  fn.__.name = name;
}
export {
  moveFile,
  renameFile
};
