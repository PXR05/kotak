import { invalidateAll, goto } from "$app/navigation";
import type {
  FileItem,
  FileAction,
  UploadableFile,
  TrashedItem,
} from "$lib/types/file.js";
import { openConfirmationDialog } from "../dialogs/confirmationDialog.svelte.js";
import { openRenameDialog } from "../dialogs/renameDialog.svelte.js";
import { openCreateFolderDialog } from "../dialogs/createFolderDialog.svelte.js";
import { openFilePreviewDialog } from "../dialogs/filePreviewDialog.svelte.js";
import { openMoveDialog } from "../dialogs/moveDialog.svelte.js";
import { openInfoDialog } from "../dialogs/infoDialog.svelte.js";
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
import { uploadUtils } from "./uploadUtils.js";
import { downloadUtils } from "./downloadUtils.js";
import { capitalize } from "$lib/utils/format.js";
import {
  renameFolder,
  createFolder,
  moveFolder,
} from "$lib/remote/folders.remote.js";
import { shareFile, shareFolder } from "$lib/remote/sharing.remote.js";
import {
  trashItem,
  restoreFile,
  restoreFolder,
  permanentDeleteFile,
  permanentDeleteFolder,
  emptyTrash,
} from "$lib/remote/trash.remote.js";
import { moveFile, renameFile } from "$lib/remote/files.remote.js";

export type { UploadOptions } from "./uploadUtils.js";

export const fileOperations = {
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

  async handleRename(item: FileItem, newName: string) {
    if (item.type === "file") {
      const { data, error } = await renameFile({
        fileId: item.id,
        newName,
      });
      if (error || !data) {
        toast.error(`Failed to rename file: ${error || "Unknown error"}`);
        return;
      }
      toast.success(`File renamed to "${data.name}" successfully`);
    } else {
      const { data, error } = await renameFolder({
        folderId: item.id,
        newName,
      });
      if (error || !data) {
        toast.error(`Failed to rename folder: ${error || "Unknown error"}`);
        return;
      }
      toast.success(`Folder renamed to "${data.name}" successfully`);
    }
  },

  async handleTrash(item: FileItem) {
    const trashRecord = {
      itemId: item.id,
      itemType: item.type,
      originalFolderId: item.type === "file" ? item.folderId : undefined,
      originalParentId: item.type === "folder" ? item.parentId : undefined,
      name: item.name,
    };

    const { data, error } = await trashItem(trashRecord);
    if (error || !data) {
      toast.error(`Failed to move item to trash: ${error || "Unknown error"}`);
      return;
    }
    toast.success(`"${item.name}" moved to trash successfully`);
    invalidateAll();
    this.clearSelection();
  },

  async handleCreateFolder(name: string) {
    const { data, error } = await createFolder({
      name,
      parentId: currentFolderId.value || undefined,
    });
    if (error || !data) {
      toast.error(`Failed to create folder: ${error || "Unknown error"}`);
      return;
    }
    toast.success(`Folder "${data.name}" created successfully`);
  },

  async handleFilesUpload(uploadableFiles: UploadableFile[]) {
    await uploadUtils.handleFilesUpload(uploadableFiles, currentFolderId.value);
  },

  async downloadFile(item: FileItem) {
    await downloadUtils.downloadFile(item);
  },

  async handleAction(
    action: FileAction,
    item: FileItem,
    callback?: () => void
  ) {
    switch (action) {
      case "open":
        this.handleItemClick(item);
        break;
      case "info":
        openInfoDialog(item);
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

  selectAll: selectionUtils.selectAll,
  clearSelection: selectionUtils.clearSelection,
  toggleSelection: selectionUtils.toggleSelection,

  async moveItems(items: FileItem[], targetFolderId: string | null) {
    try {
      const movePromises = items.map((item) =>
        item.type === "file"
          ? moveFile({
              fileId: item.id,
              targetFolderId,
            })
          : moveFolder({
              folderId: item.id,
              targetParentId: targetFolderId,
            })
      );
      const results = await Promise.all(movePromises);

      const skipped = results.filter((r) => r.data && r.data.skipped);

      if (items.length - skipped.length > 0) {
        toast.success(
          `Successfully moved ${items.length - skipped.length} item(s)`
        );
      }

      if (skipped.length > 0) {
        const skippedNames = skipped.map((r) => r.data?.item.name).join(", ");
        toast.warning(
          `Skipped ${skipped.length} item(s) due to name conflicts: ${skippedNames}`
        );
      }

      this.clearSelection();
    } catch (error) {
      console.error("Failed to move items:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to move items: ${errorMessage}`);
      throw error;
    }
  },

  async bulkMove() {
    if (selectedItems.length === 0) return;

    openMoveDialog(selectedItems, async (targetFolderId: string | null) => {
      await this.moveItems(selectedItems, targetFolderId);
    });
  },

  async bulkTrash() {
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
        } catch (error) {
          console.error("Failed to trash items:", error);
        }
      }
    );
  },

  async bulkDownload() {
    await downloadUtils.bulkDownload(selectedItems);
  },

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

  setCurrentFolder: contextUtils.setCurrentFolder,
  setCurrentUser: contextUtils.setCurrentUser,

  async handleShare(item: FileItem, shareData: ShareData) {
    const { data: result, error } =
      item.type === "file"
        ? await shareFile({
            ...shareData,
            itemId: item.id,
          })
        : await shareFolder({
            ...shareData,
            itemId: item.id,
          });
    if (error || !result) {
      toast.error(`Failed to share ${item.type}: ${error || "Unknown error"}`);
      return;
    }
    if (result.success) {
      if (result.publicUrl) {
        toast.success(
          `${result.message || `${capitalize(item.type)} shared successfully`}`
        );
      } else {
        toast.success(
          result.message ||
            `${capitalize(item.type)} shared successfully with specified users.`
        );
      }
      return { shareId: result.shareId, publicUrl: result.publicUrl };
    }
  },

  async restoreItem(item: TrashedItem) {
    if (item.type === "file") {
      const { data, error } = await restoreFile({
        itemId: item.itemId,
      });
      if (error || !data) {
        toast.error(`Failed to restore file: ${error || "Unknown error"}`);
        return;
      }
      toast.success(`File "${item.name}" restored successfully`);
    } else {
      const { data, error } = await restoreFolder({
        itemId: item.itemId,
      });
      if (error || !data) {
        toast.error(`Failed to restore folder: ${error || "Unknown error"}`);
        return;
      }
      toast.success(`Folder "${item.name}" restored successfully`);
    }
  },

  async permanentlyDeleteItem(item: TrashedItem) {
    if (item.type === "file") {
      const { data, error } = await permanentDeleteFile({
        itemId: item.itemId,
      });
      if (error || !data) {
        toast.error(
          `Failed to permanently delete file: ${error || "Unknown error"}`
        );
        return;
      }
      toast.success(`File "${item.name}" permanently deleted`);
    } else {
      const { data, error } = await permanentDeleteFolder({
        itemId: item.itemId,
      });
      if (error || !data) {
        toast.error(
          `Failed to permanently delete folder: ${error || "Unknown error"}`
        );
        return;
      }
      toast.success(`Folder "${item.name}" permanently deleted`);
    }
  },

  async emptyTrash() {
    const { data, error } = await emptyTrash();
    if (error || !data) {
      toast.error(`Failed to empty trash: ${error || "Unknown error"}`);
      return;
    }
    toast.success("Trash emptied successfully");
  },
};
