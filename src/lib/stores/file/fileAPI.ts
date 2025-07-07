import { invalidateAll } from "$app/navigation";
import type { FileItem } from "$lib/types/file.js";

export interface CreateFolderOptions {
  name: string;
  parentId?: string;
}

export interface MoveItemResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  itemName: string;
}

export interface ShareItemOptions {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
}

export interface ShareResult {
  success: boolean;
  shareId: string;
  publicUrl?: string;
  message?: string;
}

export interface ExistingShareData {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
  shareId: string;
}

/**
 * File and folder API operations
 */
export const fileAPI = {
  /**
   * Create a new folder
   */
  async createFolder(options: CreateFolderOptions): Promise<boolean> {
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: options.name,
          parentId: options.parentId,
        }),
      });

      if (response.ok) {
        await invalidateAll();
        return true;
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create folder: ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Rename a file or folder
   */
  async renameItem(item: FileItem, newName: string): Promise<void> {
    try {
      const endpoint =
        item.type === "file"
          ? `/api/files/${item.id}`
          : `/api/folders/${item.id}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to rename: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to rename item:", error);
      throw error;
    }
  },

  /**
   * Delete a file or folder
   */
  async deleteItem(item: FileItem): Promise<void> {
    try {
      const endpoint =
        item.type === "file"
          ? `/api/files/${item.id}`
          : `/api/folders/${item.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to delete: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      throw error;
    }
  },

  /**
   * Move item to a different folder
   */
  async moveItemToFolder(
    item: FileItem,
    targetFolderId: string | null
  ): Promise<MoveItemResult> {
    const endpoint =
      item.type === "file"
        ? `/api/files/${item.id}`
        : `/api/folders/${item.id}`;

    const requestBody =
      item.type === "file"
        ? { folderId: targetFolderId, skipConflicts: true }
        : { parentId: targetFolderId, skipConflicts: true };

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to move "${item.name}": ${errorText}`);
    }

    const result = await response.json();

    return {
      success: !result.skipped,
      skipped: result.skipped,
      reason: result.reason,
      itemName: item.name,
    };
  },

  /**
   * Fetch folder contents recursively
   */
  async fetchFolderContentsRecursively(
    folderId: string,
    path = ""
  ): Promise<Array<FileItem & { relativePath?: string }>> {
    try {
      const response = await fetch(`/api/folders/${folderId}/children`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch folder contents: ${response.statusText}`
        );
      }

      const contents: FileItem[] = await response.json();
      const allItems: Array<FileItem & { relativePath?: string }> = [];

      for (const item of contents) {
        if (item.type === "file") {
          allItems.push({
            ...item,
            relativePath: path ? `${path}/${item.name}` : item.name,
          });
        } else if (item.type === "folder") {
          const subItems = await this.fetchFolderContentsRecursively(
            item.id,
            path ? `${path}/${item.name}` : item.name
          );
          allItems.push(...subItems);
        }
      }

      return allItems;
    } catch (error) {
      console.error(`Failed to fetch folder contents for ${folderId}:`, error);
      return [];
    }
  },

  /**
   * Get existing share data for a file or folder
   */
  async getExistingShare(item: FileItem): Promise<ExistingShareData | null> {
    try {
      const endpoint =
        item.type === "file"
          ? `/api/files/${item.id}/share`
          : `/api/folders/${item.id}/share`;

      const response = await fetch(endpoint, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isPublic: data.isPublic,
          emails: data.emails || [],
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          shareId: data.shareId,
        };
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error(`Failed to fetch share data: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to fetch existing share:", error);
      return null;
    }
  },

  /**
   * Share a file or folder
   */
  async shareItem(
    item: FileItem,
    options: ShareItemOptions
  ): Promise<ShareResult> {
    try {
      const endpoint =
        item.type === "file"
          ? `/api/files/${item.id}/share`
          : `/api/folders/${item.id}/share`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPublic: options.isPublic,
          emails: options.emails,
          expiresAt: options.expiresAt?.toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          shareId: result.shareId,
          publicUrl: result.publicUrl,
          message: result.message,
        };
      } else {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || JSON.stringify(errorData);
        } catch {
          errorText = await response.text();
        }
        throw new Error(`Failed to share: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to share item:", error);
      throw error;
    }
  },

  /**
   * Delete a share for a file or folder
   */
  async deleteShare(item: FileItem): Promise<void> {
    try {
      const endpoint =
        item.type === "file"
          ? `/api/files/${item.id}/share`
          : `/api/folders/${item.id}/share`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (response.ok) {
        return;
      } else {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || JSON.stringify(errorData);
        } catch {
          errorText = await response.text();
        }
        throw new Error(`Failed to delete share: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to delete share:", error);
      throw error;
    }
  },
};
