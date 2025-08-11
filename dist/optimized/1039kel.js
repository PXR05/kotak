import { a } from "../chunks/event-state.js";
import { c } from "../chunks/command.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import { d, f, a as a$1 } from "../chunks/schema.js";
import { e } from "../chunks/folderUtils.js";
import { n } from "../chunks/validation.js";
import { and, eq, ne, isNull, inArray } from "drizzle-orm";
import * as z from "zod/mini";
import { getRootItems } from "./r29gge.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getFolders = q(async () => {
  const {
    locals: { user }
  } = a();
  if (!user) {
    return {
      error: "User not authenticated"
    };
  }
  try {
    const folders = await d.select({
      id: f.id,
      name: f.name,
      ownerId: f.ownerId,
      parentId: f.parentId,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }).from(f).where(
      and(
        eq(f.ownerId, user.id),
        ne(f.name, "__root__"),
        ne(f.name, "__trash__")
      )
    ).orderBy(f.name);
    const transformedFolders = folders.map((folder2) => ({
      ...folder2,
      type: "folder"
    }));
    return {
      data: transformedFolders
    };
  } catch (err) {
    console.error("Error fetching folders:", err);
    return {
      error: "Failed to fetch folders"
    };
  }
});
const getFolderChildren = q(z.string(), async (folderId) => {
  const {
    locals: { user }
  } = a();
  if (!user) {
    return {
      error: "User not authenticated"
    };
  }
  if (!folderId) {
    return {
      error: "Missing folder ID"
    };
  }
  try {
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, folderId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        error: "Folder not found or access denied"
      };
    }
    const childFolders = await d.select({
      id: f.id,
      name: f.name,
      ownerId: f.ownerId,
      parentId: f.parentId,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }).from(f).where(
      and(
        eq(f.parentId, folderId),
        eq(f.ownerId, user.id)
      )
    ).orderBy(f.name);
    const childFiles = await d.select({
      id: a$1.id,
      name: a$1.name,
      ownerId: a$1.ownerId,
      storageKey: a$1.storageKey,
      folderId: a$1.folderId,
      size: a$1.size,
      mimeType: a$1.mimeType,
      createdAt: a$1.createdAt,
      updatedAt: a$1.updatedAt
    }).from(a$1).where(
      and(eq(a$1.folderId, folderId), eq(a$1.ownerId, user.id))
    ).orderBy(a$1.name);
    const children = [
      ...childFolders.map((f2) => ({
        ...f2,
        type: "folder"
      })),
      ...childFiles.map((f2) => ({
        ...f2,
        type: "file"
      }))
    ];
    return {
      data: children
    };
  } catch (err) {
    console.error("Error fetching folder children:", err);
    return {
      error: "Failed to fetch folder children"
    };
  }
});
const createFolder = c(
  z.object({
    name: n,
    parentId: z.optional(z.string())
  }),
  async ({ name, parentId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!parentId) {
      const rootFolder = await e(user.id);
      parentId = rootFolder.id;
    }
    const [parentFolder] = await d.select().from(f).where(
      and(eq(f.id, parentId), eq(f.ownerId, user.id))
    );
    if (!parentFolder) {
      return {
        error: "Parent folder not found or access denied"
      };
    }
    const [existingFolder] = await d.select().from(f).where(
      and(
        eq(f.parentId, parentId),
        eq(f.name, name.trim()),
        eq(f.ownerId, user.id)
      )
    );
    if (existingFolder) {
      return {
        error: "A folder with this name already exists in this location"
      };
    }
    const [newFolder] = await d.insert(f).values({
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      ownerId: user.id,
      parentId
    }).returning();
    if (parentId.startsWith("root-")) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(parentId).refresh();
    }
    return {
      data: newFolder
    };
  }
);
const renameFolder = c(
  z.object({
    folderId: z.string(),
    newName: n
  }),
  async ({ folderId, newName }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, folderId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        error: "Folder not found or access denied"
      };
    }
    if (folder$1.name === "__root__" || folder$1.name === "__trash__") {
      return {
        error: "Cannot modify system folders"
      };
    }
    const trimmedName = newName.trim();
    const [existingFolder] = await d.select().from(f).where(
      and(
        folder$1.parentId === null ? isNull(f.parentId) : eq(f.parentId, folder$1.parentId),
        eq(f.name, trimmedName),
        eq(f.ownerId, user.id)
      )
    );
    if (existingFolder && existingFolder.id !== folder$1.id) {
      return {
        error: "A folder with this name already exists in this location"
      };
    }
    const [updatedFolder] = await d.update(f).set({
      name: trimmedName,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(f.id, folderId)).returning();
    if (!folder$1.parentId) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(folder$1.parentId).refresh();
    }
    return {
      data: updatedFolder
    };
  }
);
const moveFolder = c(
  z.object({
    folderIds: z.array(z.string()),
    targetParentId: z.nullable(z.string())
  }),
  async ({ folderIds, targetParentId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!folderIds || folderIds.length === 0) {
      return {
        error: "No folders provided"
      };
    }
    let resolvedTargetParentId;
    if (targetParentId === null) {
      const rootFolder = await e(user.id);
      resolvedTargetParentId = rootFolder.id;
    } else {
      const [targetFolder] = await d.select().from(f).where(
        and(
          eq(f.id, targetParentId),
          eq(f.ownerId, user.id)
        )
      );
      if (!targetFolder) {
        return {
          error: "Target folder not found or access denied"
        };
      }
      resolvedTargetParentId = targetParentId;
    }
    const foldersToMove = await d.select().from(f).where(
      and(
        eq(f.ownerId, user.id),
        inArray(f.id, folderIds)
      )
    );
    if (foldersToMove.length !== folderIds.length) {
      return {
        error: "One or more folders not found or access denied"
      };
    }
    const results = [];
    const affectedSourceParentIds = /* @__PURE__ */ new Set();
    for (const folder$1 of foldersToMove) {
      if (folder$1.name === "__root__" || folder$1.name === "__trash__") {
        results.push({ skipped: true, item: folder$1 });
        continue;
      }
      if (resolvedTargetParentId === folder$1.id) {
        results.push({ skipped: true, item: folder$1 });
        continue;
      }
      if (resolvedTargetParentId) {
        const [targetFolder] = await d.select().from(f).where(
          and(
            eq(f.id, resolvedTargetParentId),
            eq(f.ownerId, user.id)
          )
        );
        if (targetFolder && targetFolder.parentId === folder$1.id) {
          results.push({ skipped: true, item: folder$1 });
          continue;
        }
      }
      const [conflict] = await d.select().from(f).where(
        and(
          resolvedTargetParentId === null ? isNull(f.parentId) : eq(f.parentId, resolvedTargetParentId),
          eq(f.name, folder$1.name),
          eq(f.ownerId, user.id)
        )
      );
      if (conflict && conflict.id !== folder$1.id) {
        results.push({ skipped: true, item: conflict });
        continue;
      }
      const [updatedFolder] = await d.update(f).set({
        parentId: resolvedTargetParentId,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(f.id, folder$1.id)).returning();
      results.push({ skipped: false, item: updatedFolder });
      affectedSourceParentIds.add(folder$1.parentId);
    }
    const refreshPromises = [];
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
        results
      }
    };
  }
);
for (const [name, fn] of Object.entries({ createFolder, getFolderChildren, getFolders, moveFolder, renameFolder })) {
  fn.__.id = "1039kel/" + name;
  fn.__.name = name;
}
export {
  createFolder,
  getFolderChildren,
  getFolders,
  moveFolder,
  renameFolder
};
