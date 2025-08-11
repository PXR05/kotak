import { a } from "../chunks/event-state.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import { a as a$1, d, f } from "../chunks/schema.js";
import { eq, ilike, and, ne } from "drizzle-orm";
import * as z from "zod/mini";
import "../chunks/command.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const searchDrive = q(
  z.object({
    query: z.string(),
    folderId: z.nullable(z.optional(z.string())),
    type: z.nullable(z.optional(z.enum(["files", "folders"]))),
    limit: z.nullable(z.optional(z.int().check(z.positive())))
  }),
  async ({ query: query2, folderId, type, limit }) => {
    const {
      locals: { user }
    } = a();
    if (!user) {
      return {
        error: "User not authenticated"
      };
    }
    const DEFAULT_LIMIT = 20;
    if (!query2 || typeof query2 !== "string") {
      return {
        error: "Missing or invalid search query"
      };
    }
    const trimmedQuery = query2.trim();
    if (!trimmedQuery) {
      return {
        error: "Search query cannot be empty"
      };
    }
    const searchPattern = `%${trimmedQuery.replace(/[%_]/g, "\\$&")}%`;
    const results = {
      files: [],
      folders: []
    };
    try {
      if (!type || type === "files") {
        let fileWhereConditions = [
          eq(a$1.ownerId, user.id),
          ilike(a$1.name, searchPattern)
        ];
        if (folderId) {
          fileWhereConditions.push(eq(a$1.folderId, folderId));
        }
        results.files = await d.select({
          id: a$1.id,
          name: a$1.name,
          ownerId: a$1.ownerId,
          storageKey: a$1.storageKey,
          folderId: a$1.folderId,
          size: a$1.size,
          mimeType: a$1.mimeType,
          createdAt: a$1.createdAt,
          updatedAt: a$1.updatedAt
        }).from(a$1).where(and(...fileWhereConditions)).limit(limit || DEFAULT_LIMIT);
      }
      if (!type || type === "folders") {
        let folderWhereConditions = [
          eq(f.ownerId, user.id),
          ilike(f.name, searchPattern),
          ne(f.name, "__root__"),
          ne(f.name, "__trash__")
        ];
        if (folderId) {
          folderWhereConditions.push(eq(f.parentId, folderId));
        }
        results.folders = await d.select({
          id: f.id,
          name: f.name,
          ownerId: f.ownerId,
          parentId: f.parentId,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt
        }).from(f).where(and(...folderWhereConditions)).limit(limit || DEFAULT_LIMIT);
      }
      const allResults = [
        ...results.files.map((f2) => ({
          ...f2,
          type: "file",
          relevance: f2.name.toLowerCase() === trimmedQuery.toLowerCase() ? 2 : 1
        })),
        ...results.folders.map((f2) => ({
          ...f2,
          type: "folder",
          relevance: f2.name.toLowerCase() === trimmedQuery.toLowerCase() ? 2 : 1
        }))
      ].sort((a2, b) => {
        if (a2.relevance !== b.relevance) {
          return b.relevance - a2.relevance;
        }
        return a2.name.localeCompare(b.name);
      }).slice(0, limit || DEFAULT_LIMIT);
      return {
        data: {
          query: trimmedQuery,
          results: allResults.map(
            ({ relevance, ...item }) => item
          ),
          total: allResults.length,
          hasMore: allResults.length === limit
        }
      };
    } catch (err) {
      console.error("Search error:", err);
      return {
        error: err instanceof Error ? err.message : "Unknown search error occurred"
      };
    }
  }
);
for (const [name, fn] of Object.entries({ searchDrive })) {
  fn.__.id = "ngsbie/" + name;
  fn.__.name = name;
}
export {
  searchDrive
};
