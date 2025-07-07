import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  folders: many(folder),
  files: many(file),
  sharedFolders: many(folderShare),
  sharedFiles: many(fileShare),
  trashedItems: many(trashedItem),
}));

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const folder = sqliteTable("folder", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): any => folder.id, {
    onDelete: "cascade",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

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

export const file = sqliteTable("file", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  folderId: text("folder_id")
    .notNull()
    .references(() => folder.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  size: integer("size").notNull().default(0),
  mimeType: text("mime_type").notNull(),
});

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

export const folderShare = sqliteTable("folder_share", {
  id: text("id").primaryKey(),
  folderId: text("folder_id")
    .notNull()
    .references(() => folder.id, { onDelete: "cascade" }),
  sharedBy: text("shared_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  permissions: text("permissions").notNull().default("read"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

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

export const fileShare = sqliteTable("file_share", {
  id: text("id").primaryKey(),
  fileId: text("file_id")
    .notNull()
    .references(() => file.id, { onDelete: "cascade" }),
  sharedBy: text("shared_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  permissions: text("permissions").notNull().default("read"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

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

export const folderShareRecipient = sqliteTable("folder_share_recipient", {
  id: text("id").primaryKey(),
  shareId: text("share_id")
    .notNull()
    .references(() => folderShare.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const folderShareRecipientRelations = relations(
  folderShareRecipient,
  ({ one }) => ({
    share: one(folderShare, {
      fields: [folderShareRecipient.shareId],
      references: [folderShare.id],
    }),
  })
);

export const fileShareRecipient = sqliteTable("file_share_recipient", {
  id: text("id").primaryKey(),
  shareId: text("share_id")
    .notNull()
    .references(() => fileShare.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const fileShareRecipientRelations = relations(
  fileShareRecipient,
  ({ one }) => ({
    share: one(fileShare, {
      fields: [fileShareRecipient.shareId],
      references: [fileShare.id],
    }),
  })
);

export const trashedItem = sqliteTable("trashed_item", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull(),
  itemType: text("item_type").notNull(),
  originalFolderId: text("original_folder_id"),
  originalParentId: text("original_parent_id"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  trashedAt: integer("trashed_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  name: text("name").notNull(),
});

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
