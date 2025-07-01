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

export const fileRelations = relations(file, ({ one }) => ({
  owner: one(user, {
    fields: [file.ownerId],
    references: [user.id],
  }),
  folder: one(folder, {
    fields: [file.folderId],
    references: [folder.id],
  }),
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Folder = typeof folder.$inferSelect;
export type File = typeof file.$inferSelect;
