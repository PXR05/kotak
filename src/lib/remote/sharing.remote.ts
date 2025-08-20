import { command, getRequestEvent, query } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as z from "zod/mini";
import { CryptoUtils } from "$lib/server/crypto";

export const shareFile = command(
  z.object({
    itemId: z.string(),
    isPublic: z.boolean(),
    emails: z.array(z.string()),
    expiresAt: z.nullable(z.optional(z.date())),
  }),
  async ({ itemId, isPublic, emails, expiresAt }) => {
    const {
      locals: { user, umk },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

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
      .select({
        id: table.file.id,
        name: table.file.name,
        storageKey: table.file.storageKey,
        ownerId: table.file.ownerId,
        encryptedDek: table.file.encryptedDek,
      })
      .from(table.file)
      .where(
        and(eq(table.file.storageKey, itemId), eq(table.file.ownerId, user.id))
      );

    if (!file) {
      return {
        error: "File not found or access denied",
      };
    }

    let decryptedDek: string | undefined;
    if (file.encryptedDek) {
      if (!umk) {
        return {
          error:
            "Session expired - please log in again to share encrypted files",
        };
      }

      try {
        decryptedDek = CryptoUtils.decryptDEK(file.encryptedDek, umk);
      } catch (error) {
        console.error("Failed to decrypt DEK for sharing:", error);
        return {
          error: "Failed to decrypt file for sharing",
        };
      }
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [existingShare] = await tx
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
          await tx
            .update(table.fileShare)
            .set({
              isPublic,
              expiresAt: expirationDate,
              decryptedDek,
            })
            .where(eq(table.fileShare.id, shareId));

          await tx
            .delete(table.fileShareRecipient)
            .where(eq(table.fileShareRecipient.shareId, shareId));
        } else {
          shareId = nanoid();
          await tx.insert(table.fileShare).values({
            id: shareId,
            fileId: file.id,
            sharedBy: user.id,
            permissions: "read",
            isPublic,
            expiresAt: expirationDate,
            decryptedDek,
          });
        }

        if (!isPublic && emails && Array.isArray(emails) && emails.length > 0) {
          const recipients = emails.map((email: string) => ({
            id: nanoid(),
            shareId,
            email: email.trim().toLowerCase(),
          }));

          await tx.insert(table.fileShareRecipient).values(recipients);
        }

        return { shareId, existingShare };
      });

      const publicUrl = isPublic
        ? `/shared/files/${result.shareId}`
        : undefined;

      await getFileShare({ itemId: file.id }).refresh();

      return {
        data: {
          success: true,
          shareId: result.shareId,
          publicUrl,
          message: result.existingShare
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
);

export const shareFolder = command(
  z.object({
    itemId: z.string(),
    isPublic: z.boolean(),
    emails: z.array(z.string()),
    expiresAt: z.nullable(z.optional(z.date())),
  }),
  async ({ itemId, isPublic, emails, expiresAt }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

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
      .where(
        and(eq(table.folder.id, itemId), eq(table.folder.ownerId, user.id))
      );

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
      const result = await db.transaction(async (tx) => {
        const [existingShare] = await tx
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
          await tx
            .update(table.folderShare)
            .set({
              isPublic,
              expiresAt: expirationDate,
            })
            .where(eq(table.folderShare.id, shareId));

          await tx
            .delete(table.folderShareRecipient)
            .where(eq(table.folderShareRecipient.shareId, shareId));
        } else {
          shareId = nanoid();
          await tx.insert(table.folderShare).values({
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

          await tx.insert(table.folderShareRecipient).values(recipients);
        }

        return { shareId, existingShare };
      });

      const publicUrl = isPublic
        ? `/shared/folders/${result.shareId}`
        : undefined;

      await getFolderShare({ itemId: folder.id }).refresh();

      return {
        data: {
          success: true,
          shareId: result.shareId,
          publicUrl,
          message: result.existingShare
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
);

export const deleteFileShare = command(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing file ID",
      };
    }

    const [file] = await db
      .select({
        id: table.file.id,
        storageKey: table.file.storageKey,
        ownerId: table.file.ownerId,
      })
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
      await db.transaction(async (tx) => {
        const [existingShare] = await tx
          .select()
          .from(table.fileShare)
          .where(
            and(
              eq(table.fileShare.fileId, file.id),
              eq(table.fileShare.sharedBy, user.id)
            )
          );

        if (!existingShare) {
          throw new Error("No share found to delete");
        }

        await tx
          .delete(table.fileShareRecipient)
          .where(eq(table.fileShareRecipient.shareId, existingShare.id));

        await tx
          .delete(table.fileShare)
          .where(eq(table.fileShare.id, existingShare.id));
      });

      await getFileShare({ itemId: file.id }).refresh();

      return {
        data: {
          success: true,
          message: "File share deleted successfully",
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message === "No share found to delete") {
        return {
          error: "No share found to delete",
        };
      }
      console.error("Failed to delete file share:", err);
      return {
        error: "Failed to delete file share",
      };
    }
  }
);

export const deleteFolderShare = command(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing folder ID",
      };
    }

    const [folder] = await db
      .select()
      .from(table.folder)
      .where(
        and(eq(table.folder.id, itemId), eq(table.folder.ownerId, user.id))
      );

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
      await db.transaction(async (tx) => {
        const [existingShare] = await tx
          .select()
          .from(table.folderShare)
          .where(
            and(
              eq(table.folderShare.folderId, folder.id),
              eq(table.folderShare.sharedBy, user.id)
            )
          );

        if (!existingShare) {
          throw new Error("No share found to delete");
        }

        await tx
          .delete(table.folderShareRecipient)
          .where(eq(table.folderShareRecipient.shareId, existingShare.id));

        await tx
          .delete(table.folderShare)
          .where(eq(table.folderShare.id, existingShare.id));
      });

      await getFolderShare({ itemId: folder.id }).refresh();

      return {
        data: {
          success: true,
          message: "Folder share deleted successfully",
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message === "No share found to delete") {
        return {
          error: "No share found to delete",
        };
      }
      console.error("Failed to delete folder share:", err);
      return {
        error: "Failed to delete folder share",
      };
    }
  }
);

export const getFileShare = query(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing file ID",
      };
    }

    const [file] = await db
      .select({
        id: table.file.id,
        storageKey: table.file.storageKey,
        ownerId: table.file.ownerId,
      })
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
);

export const getFolderShare = query(
  z.object({
    itemId: z.string(),
  }),
  async ({ itemId }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    if (!itemId) {
      return {
        error: "Missing folder ID",
      };
    }

    const [folder] = await db
      .select()
      .from(table.folder)
      .where(
        and(eq(table.folder.id, itemId), eq(table.folder.ownerId, user.id))
      );

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
);
