import { invalidateAll, goto } from "$app/navigation";
import type { FileItem, FileAction, UploadableFile } from "$lib/types/file.js";
import { openConfirmationDialog } from "../dialogs/confirmationDialog.svelte.js";
import { openRenameDialog } from "../dialogs/renameDialog.svelte.js";
import { openCreateFolderDialog } from "../dialogs/createFolderDialog.svelte.js";
import { openFilePreviewDialog } from "../dialogs/filePreviewDialog.svelte.js";
import { openMoveDialog } from "../dialogs/moveDialog.svelte.js";
import {
  openShareDialog,
  type ShareData,
} from "../dialogs/shareDialog.svelte.js";
import { toast } from "svelte-sonner";

import {
  selectedItems,
  currentFolderId,
  selectionUtils,
  contextUtils,
} from "./fileState.svelte.js";
import { fileAPI, type CreateFolderOptions } from "./fileAPI.js";
import { uploadUtils } from "./uploadUtils.js";
import { downloadUtils } from "./downloadUtils.js";
import { capitalize } from "$lib/utils/format.js";

export {
  selectedItems,
  currentFolderId,
  isUploading,
  isDownloading,
  uploadProgress,
  lastSelectedIndex,
  currentUserId,
} from "./fileState.svelte.js";

export type { UploadOptions } from "./uploadUtils.js";
export { type CreateFolderOptions };

/**
 * Main file operations interface
 */

export const fileOperations = {
  /**
   * Handle clicking on a file or folder item
   */
  handleItemClick(
    item: FileItem,
    fileList: FileItem[] = [],
    currentIndex: number = 0
  ) {
    if (item.type === "folder") {
      goto(`/${item.id}`);
    } else {
      openFilePreviewDialog(item, fileList, currentIndex);
    }
  },

  /**
   * Handle renaming an item
   */
  async handleRename(item: FileItem, newName: string) {
    await fileAPI.renameItem(item, newName);
  },

  /**
   * Handle deleting an item
   */
  async handleDelete(item: FileItem) {
    await fileAPI.deleteItem(item);
    selectionUtils.removeFromSelection(item);
  },

  /**
   * Handle moving an item to trash
   */
  async handleTrash(item: FileItem) {
    await fileAPI.trashItem(item);
    selectionUtils.removeFromSelection(item);
  },

  /**
   * Handle creating a new folder
   */
  async handleCreateFolder(name: string) {
    try {
      await fileAPI.createFolder({
        name,
        parentId: currentFolderId.value || undefined,
      });
    } catch (error) {
      console.error("Failed to create folder:", error);
      throw error;
    }
  },

  /**
   * Handle uploading files
   */
  async handleFilesUpload(uploadableFiles: UploadableFile[]) {
    await uploadUtils.handleFilesUpload(uploadableFiles, currentFolderId.value);
  },

  /**
   * Download a single file or folder
   */
  async downloadFile(item: FileItem) {
    await downloadUtils.downloadFile(item);
  },

  /**
   * Handle various file actions
   */
  async handleAction(
    action: FileAction,
    item: FileItem,
    callback?: () => void
  ) {
    switch (action) {
      case "open":
        this.handleItemClick(item);
        break;
      case "download":
        this.downloadFile(item);
        break;
      case "move":
        openMoveDialog([item], async (targetFolderId: string | null) => {
          await this.moveItems([item], targetFolderId);
          callback?.();
        });
        break;
      case "rename":
        openRenameDialog(item, async (newName: string) => {
          await this.handleRename(item, newName);
          callback?.();
        });
        break;
      case "trash":
        openConfirmationDialog(
          {
            title: `Move ${item.type} to trash`,
            description: `Are you sure you want to move "${item.name}" to trash?`,
            confirmText: "Move to Trash",
            cancelText: "Cancel",
            variant: "destructive",
          },
          async () => {
            await this.handleTrash(item);
            callback?.();
          }
        );
        break;
      case "share":
        openShareDialog(item, async (shareData) => {
          const result = await this.handleShare(item, shareData);
          callback?.();
          return result || { shareId: "", publicUrl: undefined };
        });
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  },

  /**
   * Selection management
   */
  selectAll: selectionUtils.selectAll,
  clearSelection: selectionUtils.clearSelection,
  toggleSelection: selectionUtils.toggleSelection,

  /**
   * Move items to a different folder
   */
  async moveItems(items: FileItem[], targetFolderId: string | null) {
    try {
      const movePromises = items.map((item) =>
        fileAPI.moveItemToFolder(item, targetFolderId)
      );
      const results = await Promise.all(movePromises);

      const successful = results.filter((r) => r.success);
      const skipped = results.filter((r) => r.skipped);

      if (successful.length > 0) {
        toast.success(`Successfully moved ${successful.length} item(s)`);
      }

      if (skipped.length > 0) {
        const skippedNames = skipped.map((r) => r.itemName).join(", ");
        toast.warning(
          `Skipped ${skipped.length} item(s) due to name conflicts: ${skippedNames}`
        );
      }

      await invalidateAll();
    } catch (error) {
      console.error("Failed to move items:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to move items: ${errorMessage}`);
      throw error;
    }
  },

  /**
   * Bulk operations
   */
  async bulkMove() {
    if (selectedItems.length === 0) return;

    openMoveDialog(selectedItems, async (targetFolderId: string | null) => {
      await this.moveItems(selectedItems, targetFolderId);
      this.clearSelection();
    });
  },

  async bulkDelete() {
    if (selectedItems.length === 0) return;

    const itemCount = selectedItems.length;
    openConfirmationDialog(
      {
        title: `Move ${itemCount} items to trash`,
        description: `Are you sure you want to move ${itemCount} selected items to trash?`,
        confirmText: "Move to Trash",
        cancelText: "Cancel",
        variant: "destructive",
      },
      async () => {
        try {
          const trashPromises = selectedItems.map((item) =>
            this.handleTrash(item)
          );
          await Promise.all(trashPromises);
          this.clearSelection();
        } catch (error) {
          console.error("Failed to trash items:", error);
        }
      }
    );
  },

  async bulkDownload() {
    await downloadUtils.bulkDownload(selectedItems);
  },

  /**
   * Handle context menu actions
   */
  handleContextMenuAction(action: string, item?: FileItem | null) {
    switch (action) {
      case "upload":
        document
          .querySelector<HTMLInputElement>(
            'input[type="file"]:not([webkitdirectory])'
          )
          ?.click();
        break;
      case "upload-folder":
        document
          .querySelector<HTMLInputElement>(
            'input[type="file"][webkitdirectory]'
          )
          ?.click();
        break;
      case "refresh":
        invalidateAll();
        break;
      case "create-folder":
        openCreateFolderDialog((name: string) => this.handleCreateFolder(name));
        break;
      default:
        if (item && action) {
          this.handleAction(action as FileAction, item);
        }
        break;
    }
  },

  /**
   * Context management
   */
  setCurrentFolder: contextUtils.setCurrentFolder,
  setCurrentUser: contextUtils.setCurrentUser,

  /**
   * Handle sharing an item
   */
  async handleShare(item: FileItem, shareData: ShareData) {
    try {
      const result = await fileAPI.shareItem(item, shareData);
      if (result.success) {
        if (result.publicUrl) {
          toast.success(
            `${
              result.message || `${capitalize(item.type)} shared successfully`
            }`
          );
        } else {
          toast.success(
            result.message ||
              `${capitalize(
                item.type
              )} shared successfully with specified users.`
          );
        }
        return { shareId: result.shareId, publicUrl: result.publicUrl };
      }
    } catch (error) {
      console.error("Failed to share item:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to share ${item.type}: ${errorMessage}`);
      throw error;
    }
  },

  /**
   * Trash operations
   */
  async getTrashedItems() {
    return await fileAPI.getTrashedItems();
  },

  async restoreItem(itemId: string) {
    try {
      await fileAPI.restoreItem(itemId);
      toast.success("Item restored successfully");
    } catch (error) {
      console.error("Failed to restore item:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to restore item: ${errorMessage}`);
      throw error;
    }
  },

  async permanentlyDeleteItem(itemId: string) {
    try {
      await fileAPI.permanentlyDeleteItem(itemId);
      toast.success("Item permanently deleted");
    } catch (error) {
      console.error("Failed to permanently delete item:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to permanently delete item: ${errorMessage}`);
      throw error;
    }
  },

  async emptyTrash() {
    try {
      await fileAPI.emptyTrash();
      toast.success("Trash emptied successfully");
    } catch (error) {
      console.error("Failed to empty trash:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to empty trash: ${errorMessage}`);
      throw error;
    }
  },
};
