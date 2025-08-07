import { getRequestEvent, query } from "$app/server";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, ilike, ne } from "drizzle-orm";
import * as z from "zod/mini";

export type SearchResult = {
  id: string;
  name: string;
  type: "file" | "folder";
  ownerId: string;
  storageKey?: string;
  folderId?: string;
  parentId?: string;
  size?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const searchDrive = query(
  z.object({
    query: z.string(),
    folderId: z.nullable(z.optional(z.string())),
    type: z.nullable(z.optional(z.enum(["files", "folders"]))),
    limit: z.nullable(z.optional(z.int().check(z.positive()))),
  }),
  async ({ query, folderId, type, limit }) => {
    const {
      locals: { user },
    } = getRequestEvent();
    if (!user) {
      return {
        error: "User not authenticated",
      };
    }

    const DEFAULT_LIMIT = 20;

    if (!query || typeof query !== "string") {
      return {
        error: "Missing or invalid search query",
      };
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        error: "Search query cannot be empty",
      };
    }

    const searchPattern = `%${trimmedQuery.replace(/[%_]/g, "\\$&")}%`;
    const results: { files: any[]; folders: any[] } = {
      files: [],
      folders: [],
    };

    try {
      if (!type || type === "files") {
        let fileWhereConditions = [
          eq(table.file.ownerId, user.id),
          ilike(table.file.name, searchPattern),
        ];

        if (folderId) {
          fileWhereConditions.push(eq(table.file.folderId, folderId));
        }

        results.files = await db
          .select({
            id: table.file.id,
            name: table.file.name,
            ownerId: table.file.ownerId,
            storageKey: table.file.storageKey,
            folderId: table.file.folderId,
            size: table.file.size,
            mimeType: table.file.mimeType,
            createdAt: table.file.createdAt,
            updatedAt: table.file.updatedAt,
          })
          .from(table.file)
          .where(and(...fileWhereConditions))
          .limit(limit || DEFAULT_LIMIT);
      }

      if (!type || type === "folders") {
        let folderWhereConditions = [
          eq(table.folder.ownerId, user.id),
          ilike(table.folder.name, searchPattern),
          ne(table.folder.name, "__root__"),
          ne(table.folder.name, "__trash__"),
        ];

        if (folderId) {
          folderWhereConditions.push(eq(table.folder.parentId, folderId));
        }

        results.folders = await db
          .select({
            id: table.folder.id,
            name: table.folder.name,
            ownerId: table.folder.ownerId,
            parentId: table.folder.parentId,
            createdAt: table.folder.createdAt,
            updatedAt: table.folder.updatedAt,
          })
          .from(table.folder)
          .where(and(...folderWhereConditions))
          .limit(limit || DEFAULT_LIMIT);
      }

      const allResults = [
        ...results.files.map((f) => ({
          ...f,
          type: "file" as const,
          relevance:
            f.name.toLowerCase() === trimmedQuery.toLowerCase() ? 2 : 1,
        })),
        ...results.folders.map((f) => ({
          ...f,
          type: "folder" as const,
          relevance:
            f.name.toLowerCase() === trimmedQuery.toLowerCase() ? 2 : 1,
        })),
      ]
        .sort((a, b) => {
          if (a.relevance !== b.relevance) {
            return b.relevance - a.relevance;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, limit || DEFAULT_LIMIT);

      return {
        data: {
          query: trimmedQuery,
          results: allResults.map(
            ({ relevance, ...item }) => item
          ) as SearchResult[],
          total: allResults.length,
          hasMore: allResults.length === limit,
        },
      };
    } catch (err) {
      console.error("Search error:", err);
      return {
        error:
          err instanceof Error ? err.message : "Unknown search error occurred",
      };
    }
  }
);
