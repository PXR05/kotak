import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getContext } from "telefunc";
import { nanoid } from "nanoid";

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
