import { a } from "../chunks/event-state.js";
import { c } from "../chunks/command.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import { d, a as a$1, b, c as c$1, f, e, g } from "../chunks/schema.js";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as z from "zod/mini";
import "./1039kel.js";
import "./r29gge.js";
import "../chunks/false.js";
import "../chunks/paths.js";
import "../chunks/folderUtils.js";
import "../chunks/validation.js";
const shareFile = c(
  z.object({
    itemId: z.string(),
    isPublic: z.boolean(),
    emails: z.array(z.string()),
    expiresAt: z.nullable(z.optional(z.date()))
  }),
  async ({ itemId, isPublic, emails, expiresAt }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing file ID"
      };
    }
    if (typeof isPublic !== "boolean") {
      return {
        error: "isPublic must be a boolean"
      };
    }
    const [file$1] = await d.select().from(a$1).where(
      and(eq(a$1.storageKey, itemId), eq(a$1.ownerId, user.id))
    );
    if (!file$1) {
      return {
        error: "File not found or access denied"
      };
    }
    try {
      const result = await d.transaction(async (tx) => {
        const [existingShare] = await tx.select().from(b).where(
          and(
            eq(b.fileId, file$1.id),
            eq(b.sharedBy, user.id)
          )
        );
        const expirationDate = expiresAt ? new Date(expiresAt) : null;
        let shareId;
        if (existingShare) {
          shareId = existingShare.id;
          await tx.update(b).set({
            isPublic,
            expiresAt: expirationDate
          }).where(eq(b.id, shareId));
          await tx.delete(c$1).where(eq(c$1.shareId, shareId));
        } else {
          shareId = nanoid();
          await tx.insert(b).values({
            id: shareId,
            fileId: file$1.id,
            sharedBy: user.id,
            permissions: "read",
            isPublic,
            expiresAt: expirationDate
          });
        }
        if (!isPublic && emails && Array.isArray(emails) && emails.length > 0) {
          const recipients = emails.map((email) => ({
            id: nanoid(),
            shareId,
            email: email.trim().toLowerCase()
          }));
          await tx.insert(c$1).values(recipients);
        }
        return { shareId, existingShare };
      });
      const publicUrl = isPublic ? `/shared/files/${result.shareId}` : void 0;
      await getFileShare({ itemId: file$1.id }).refresh();
      return {
        data: {
          success: true,
          shareId: result.shareId,
          publicUrl,
          message: result.existingShare ? "File sharing updated successfully" : "File shared successfully"
        }
      };
    } catch (err) {
      console.error("Error sharing file:", err);
      return {
        error: "Failed to share file"
      };
    }
  }
);
const shareFolder = c(
  z.object({
    itemId: z.string(),
    isPublic: z.boolean(),
    emails: z.array(z.string()),
    expiresAt: z.nullable(z.optional(z.date()))
  }),
  async ({ itemId, isPublic, emails, expiresAt }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing folder ID"
      };
    }
    if (typeof isPublic !== "boolean") {
      return {
        error: "isPublic must be a boolean"
      };
    }
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, itemId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        error: "Folder not found or access denied"
      };
    }
    if (folder$1.name === "__root__" || folder$1.name === "__trash__") {
      return {
        error: "Cannot share system folders"
      };
    }
    try {
      const result = await d.transaction(async (tx) => {
        const [existingShare] = await tx.select().from(e).where(
          and(
            eq(e.folderId, folder$1.id),
            eq(e.sharedBy, user.id)
          )
        );
        const expirationDate = expiresAt ? new Date(expiresAt) : null;
        let shareId;
        if (existingShare) {
          shareId = existingShare.id;
          await tx.update(e).set({
            isPublic,
            expiresAt: expirationDate
          }).where(eq(e.id, shareId));
          await tx.delete(g).where(eq(g.shareId, shareId));
        } else {
          shareId = nanoid();
          await tx.insert(e).values({
            id: shareId,
            folderId: folder$1.id,
            sharedBy: user.id,
            permissions: "read",
            isPublic,
            expiresAt: expirationDate
          });
        }
        if (!isPublic && emails && Array.isArray(emails) && emails.length > 0) {
          const recipients = emails.map((email) => ({
            id: nanoid(),
            shareId,
            email: email.trim().toLowerCase()
          }));
          await tx.insert(g).values(recipients);
        }
        return { shareId, existingShare };
      });
      const publicUrl = isPublic ? `/shared/folders/${result.shareId}` : void 0;
      await getFolderShare({ itemId: folder$1.id }).refresh();
      return {
        data: {
          success: true,
          shareId: result.shareId,
          publicUrl,
          message: result.existingShare ? "Folder sharing updated successfully" : "Folder shared successfully"
        }
      };
    } catch (err) {
      console.error("Error sharing folder:", err);
      return {
        error: "Failed to share folder"
      };
    }
  }
);
const deleteFileShare = c(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing file ID"
      };
    }
    const [file$1] = await d.select().from(a$1).where(
      and(eq(a$1.storageKey, itemId), eq(a$1.ownerId, user.id))
    );
    if (!file$1) {
      return {
        error: "File not found or access denied"
      };
    }
    try {
      await d.transaction(async (tx) => {
        const [existingShare] = await tx.select().from(b).where(
          and(
            eq(b.fileId, file$1.id),
            eq(b.sharedBy, user.id)
          )
        );
        if (!existingShare) {
          throw new Error("No share found to delete");
        }
        await tx.delete(c$1).where(eq(c$1.shareId, existingShare.id));
        await tx.delete(b).where(eq(b.id, existingShare.id));
      });
      await getFileShare({ itemId: file$1.id }).refresh();
      return {
        data: {
          success: true,
          message: "File share deleted successfully"
        }
      };
    } catch (err) {
      if (err instanceof Error && err.message === "No share found to delete") {
        return {
          error: "No share found to delete"
        };
      }
      console.error("Failed to delete file share:", err);
      return {
        error: "Failed to delete file share"
      };
    }
  }
);
const deleteFolderShare = c(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing folder ID"
      };
    }
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, itemId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        error: "Folder not found or access denied"
      };
    }
    if (folder$1.name === "__root__" || folder$1.name === "__trash__") {
      return {
        error: "Cannot delete shares for system folders"
      };
    }
    try {
      await d.transaction(async (tx) => {
        const [existingShare] = await tx.select().from(e).where(
          and(
            eq(e.folderId, folder$1.id),
            eq(e.sharedBy, user.id)
          )
        );
        if (!existingShare) {
          throw new Error("No share found to delete");
        }
        await tx.delete(g).where(eq(g.shareId, existingShare.id));
        await tx.delete(e).where(eq(e.id, existingShare.id));
      });
      await getFolderShare({ itemId: folder$1.id }).refresh();
      return {
        data: {
          success: true,
          message: "Folder share deleted successfully"
        }
      };
    } catch (err) {
      if (err instanceof Error && err.message === "No share found to delete") {
        return {
          error: "No share found to delete"
        };
      }
      console.error("Failed to delete folder share:", err);
      return {
        error: "Failed to delete folder share"
      };
    }
  }
);
const getFileShare = q(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    var _a;
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing file ID"
      };
    }
    const [file$1] = await d.select().from(a$1).where(
      and(eq(a$1.storageKey, itemId), eq(a$1.ownerId, user.id))
    );
    if (!file$1) {
      return {
        error: "File not found or access denied"
      };
    }
    const [existingShare] = await d.select().from(b).where(
      and(
        eq(b.fileId, file$1.id),
        eq(b.sharedBy, user.id)
      )
    );
    if (!existingShare) {
      return {
        data: void 0
      };
    }
    const recipients = await d.select().from(c$1).where(eq(c$1.shareId, existingShare.id));
    return {
      data: {
        shareId: existingShare.id,
        isPublic: existingShare.isPublic,
        emails: recipients.map((r) => r.email),
        expiresAt: (_a = existingShare.expiresAt) == null ? void 0 : _a.toISOString()
      }
    };
  }
);
const getFolderShare = q(
  z.object({
    itemId: z.string()
  }),
  async ({ itemId }) => {
    var _a;
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    if (!itemId) {
      return {
        error: "Missing folder ID"
      };
    }
    const [folder$1] = await d.select().from(f).where(
      and(eq(f.id, itemId), eq(f.ownerId, user.id))
    );
    if (!folder$1) {
      return {
        error: "Folder not found or access denied"
      };
    }
    const [existingShare] = await d.select().from(e).where(
      and(
        eq(e.folderId, folder$1.id),
        eq(e.sharedBy, user.id)
      )
    );
    if (!existingShare) {
      return {
        data: void 0
      };
    }
    const recipients = await d.select().from(g).where(eq(g.shareId, existingShare.id));
    return {
      data: {
        shareId: existingShare.id,
        isPublic: existingShare.isPublic,
        emails: recipients.map((r) => r.email),
        expiresAt: (_a = existingShare.expiresAt) == null ? void 0 : _a.toISOString()
      }
    };
  }
);
for (const [name, fn] of Object.entries({ deleteFileShare, deleteFolderShare, getFileShare, getFolderShare, shareFile, shareFolder })) {
  fn.__.id = "1uebreo/" + name;
  fn.__.name = name;
}
export {
  deleteFileShare,
  deleteFolderShare,
  getFileShare,
  getFolderShare,
  shareFile,
  shareFolder
};
