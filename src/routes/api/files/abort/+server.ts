import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import path from "node:path";

const STORAGE_PATH = path.resolve(process.cwd(), "storage");

export const POST = async ({ request, locals }) => {
  if (!locals.user) error(401, "Unauthorized");

  try {
    const { storageKeys } = await request.json();

    if (!Array.isArray(storageKeys)) {
      error(400, "storageKeys must be an array");
    }

    const cleanupResults = {
      filesDeleted: 0,
      dbEntriesRemoved: 0,
      errors: [] as string[],
    };

    for (const storageKey of storageKeys) {
      try {
        const deleteResult = await db
          .delete(table.file)
          .where(
            and(
              eq(table.file.storageKey, storageKey),
              eq(table.file.ownerId, locals.user.id)
            )
          )
          .returning();

        if (deleteResult.length > 0) {
          cleanupResults.dbEntriesRemoved++;
        }

        const filePath = path.join(STORAGE_PATH, storageKey);
        try {
          await unlink(filePath);
          cleanupResults.filesDeleted++;
        } catch (fsError: any) {
          if (fsError.code !== "ENOENT") {
            cleanupResults.errors.push(
              `Failed to delete file ${storageKey}: ${fsError.message}`
            );
          }
        }
      } catch (err: any) {
        cleanupResults.errors.push(
          `Failed to cleanup ${storageKey}: ${err.message}`
        );
      }
    }

    return json({
      success: true,
      message: `Cleanup completed`,
      ...cleanupResults,
    });
  } catch (err: any) {
    console.error("Abort cleanup error:", err);
    error(500, `Failed to cleanup aborted uploads: ${err.message}`);
  }
};
