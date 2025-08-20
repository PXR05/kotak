import { relations } from "drizzle-orm";
import {
  pgTable,
  integer,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  encryptedUmk: text("encrypted_umk"),
  keySalt: text("key_salt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  folders: many(folder),
  files: many(file),
  sharedFolders: many(folderShare),
  sharedFiles: many(fileShare),
  trashedItems: many(trashedItem),
}));

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_expires_at_idx").on(table.expiresAt),
  ]
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const folder = pgTable(
  "folder",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): any => folder.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("folder_owner_id_idx").on(table.ownerId),
    index("folder_parent_id_idx").on(table.parentId),
    index("folder_owner_id_parent_id_idx").on(table.ownerId, table.parentId),
    index("folder_owner_id_name_idx").on(table.ownerId, table.name),
    index("folder_name_idx").on(table.name),
  ]
);

export const folderRelations = relations(folder, ({ one, many }) => ({
  owner: one(user, {
    fields: [folder.ownerId],
    references: [user.id],
  }),
  parent: one(folder, {
    fields: [folder.parentId],
    references: [folder.id],
    relationName: "folder_hierarchy",
  }),
  children: many(folder, {
    relationName: "folder_hierarchy",
  }),
  files: many(file),
  shares: many(folderShare),
}));

export const file = pgTable(
  "file",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    encryptedDek: text("encrypted_dek"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    folderId: text("folder_id")
      .notNull()
      .references(() => folder.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    size: integer("size").notNull().default(0),
    mimeType: text("mime_type").notNull(),
  },
  (table) => [
    index("file_owner_id_idx").on(table.ownerId),
    index("file_folder_id_idx").on(table.folderId),
    index("file_owner_id_folder_id_idx").on(table.ownerId, table.folderId),
    index("file_owner_id_name_idx").on(table.ownerId, table.name),
    index("file_name_idx").on(table.name),
    index("file_storage_key_idx").on(table.storageKey),
  ]
);

export const fileRelations = relations(file, ({ one, many }) => ({
  owner: one(user, {
    fields: [file.ownerId],
    references: [user.id],
  }),
  folder: one(folder, {
    fields: [file.folderId],
    references: [folder.id],
  }),
  shares: many(fileShare),
}));

export const folderShare = pgTable(
  "folder_share",
  {
    id: text("id").primaryKey(),
    folderId: text("folder_id")
      .notNull()
      .references(() => folder.id, { onDelete: "cascade" }),
    sharedBy: text("shared_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permissions: text("permissions").notNull().default("read"),
    isPublic: boolean("is_public").notNull().default(false),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("folder_share_folder_id_idx").on(table.folderId),
    index("folder_share_shared_by_idx").on(table.sharedBy),
    index("folder_share_folder_id_shared_by_idx").on(
      table.folderId,
      table.sharedBy
    ),
    index("folder_share_expires_at_idx").on(table.expiresAt),
    index("folder_share_is_public_idx").on(table.isPublic),
    index("folder_share_is_public_expires_at_idx").on(
      table.isPublic,
      table.expiresAt
    ),
  ]
);

export const folderShareRelations = relations(folderShare, ({ one, many }) => ({
  folder: one(folder, {
    fields: [folderShare.folderId],
    references: [folder.id],
  }),
  sharedByUser: one(user, {
    fields: [folderShare.sharedBy],
    references: [user.id],
  }),
  recipients: many(folderShareRecipient),
}));

export const fileShare = pgTable(
  "file_share",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => file.id, { onDelete: "cascade" }),
    sharedBy: text("shared_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permissions: text("permissions").notNull().default("read"),
    isPublic: boolean("is_public").notNull().default(false),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    decryptedDek: text("decrypted_dek"),
  },
  (table) => [
    index("file_share_file_id_idx").on(table.fileId),
    index("file_share_shared_by_idx").on(table.sharedBy),
    index("file_share_file_id_shared_by_idx").on(table.fileId, table.sharedBy),
    index("file_share_expires_at_idx").on(table.expiresAt),
    index("file_share_is_public_idx").on(table.isPublic),
    index("file_share_is_public_expires_at_idx").on(
      table.isPublic,
      table.expiresAt
    ),
  ]
);

export const fileShareRelations = relations(fileShare, ({ one, many }) => ({
  file: one(file, {
    fields: [fileShare.fileId],
    references: [file.id],
  }),
  sharedByUser: one(user, {
    fields: [fileShare.sharedBy],
    references: [user.id],
  }),
  recipients: many(fileShareRecipient),
}));

export const folderShareRecipient = pgTable(
  "folder_share_recipient",
  {
    id: text("id").primaryKey(),
    shareId: text("share_id")
      .notNull()
      .references(() => folderShare.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("folder_share_recipient_share_id_idx").on(table.shareId),
    index("folder_share_recipient_email_idx").on(table.email),
    index("folder_share_recipient_share_id_email_idx").on(
      table.shareId,
      table.email
    ),
  ]
);

export const folderShareRecipientRelations = relations(
  folderShareRecipient,
  ({ one }) => ({
    share: one(folderShare, {
      fields: [folderShareRecipient.shareId],
      references: [folderShare.id],
    }),
  })
);

export const fileShareRecipient = pgTable(
  "file_share_recipient",
  {
    id: text("id").primaryKey(),
    shareId: text("share_id")
      .notNull()
      .references(() => fileShare.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("file_share_recipient_share_id_idx").on(table.shareId),
    index("file_share_recipient_email_idx").on(table.email),
    index("file_share_recipient_share_id_email_idx").on(
      table.shareId,
      table.email
    ),
  ]
);

export const fileShareRecipientRelations = relations(
  fileShareRecipient,
  ({ one }) => ({
    share: one(fileShare, {
      fields: [fileShareRecipient.shareId],
      references: [fileShare.id],
    }),
  })
);

export const trashedItem = pgTable(
  "trashed_item",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    itemType: text("item_type").notNull(),
    originalFolderId: text("original_folder_id"),
    originalParentId: text("original_parent_id"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trashedAt: timestamp("trashed_at").notNull().defaultNow(),
    name: text("name").notNull(),
    encryptedDek: text("encrypted_dek"),
  },
  (table) => [
    index("trashed_item_owner_id_idx").on(table.ownerId),
    index("trashed_item_item_id_idx").on(table.itemId),
    index("trashed_item_owner_id_item_id_idx").on(table.ownerId, table.itemId),
    index("trashed_item_trashed_at_idx").on(table.trashedAt),
  ]
);

export const trashedItemRelations = relations(trashedItem, ({ one }) => ({
  owner: one(user, {
    fields: [trashedItem.ownerId],
    references: [user.id],
  }),
  originalFolder: one(folder, {
    fields: [trashedItem.originalFolderId],
    references: [folder.id],
  }),
  originalParent: one(folder, {
    fields: [trashedItem.originalParentId],
    references: [folder.id],
  }),
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Folder = typeof folder.$inferSelect;
export type File = typeof file.$inferSelect;
export type FolderShare = typeof folderShare.$inferSelect;
export type FileShare = typeof fileShare.$inferSelect;
export type FolderShareRecipient = typeof folderShareRecipient.$inferSelect;
export type FileShareRecipient = typeof fileShareRecipient.$inferSelect;
export type TrashedItem = typeof trashedItem.$inferSelect;
