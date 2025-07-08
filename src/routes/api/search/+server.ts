import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, like, ne } from "drizzle-orm";

type SearchResult = {
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

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const query = url.searchParams.get("q");
  const type = url.searchParams.get("type");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const folderId = url.searchParams.get("folderId");

  if (!query || typeof query !== "string") {
    throw error(400, "Missing or invalid search query");
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw error(400, "Search query cannot be empty");
  }

  if (limit < 1 || limit > 100) {
    throw error(400, "Limit must be between 1 and 100");
  }

  const searchPattern = `%${trimmedQuery}%`;
  const results: { files: any[]; folders: any[] } = {
    files: [],
    folders: [],
  };

  try {
    if (!type || type === "files") {
      let fileWhereConditions = [
        eq(table.file.ownerId, locals.user.id),
        like(table.file.name, searchPattern),
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
        .limit(Math.ceil(limit / 2));
    }

    if (!type || type === "folders") {
      let folderWhereConditions = [
        eq(table.folder.ownerId, locals.user.id),
        like(table.folder.name, searchPattern),
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
        .limit(Math.ceil(limit / 2));
    }

    const allResults = [
      ...results.files.map((f) => ({
        ...f,
        type: "file" as const,
        relevance: f.name.toLowerCase() === trimmedQuery.toLowerCase() ? 2 : 1,
      })),
      ...results.folders.map((f) => ({
        ...f,
        type: "folder" as const,
        relevance: f.name.toLowerCase() === trimmedQuery.toLowerCase() ? 2 : 1,
      })),
    ]
      .sort((a, b) => {
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    return json({
      query: trimmedQuery,
      results: allResults.map(
        ({ relevance, ...item }) => item
      ) as SearchResult[],
      total: allResults.length,
      hasMore: allResults.length === limit,
    });
  } catch (err) {
    console.error("Search error:", err);
    throw error(500, "Search failed");
  }
};
