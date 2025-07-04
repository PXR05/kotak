import { invalidateAll, goto } from "$app/navigation";
import type { FileItem, FileAction, UploadableFile } from "$lib/types/file.js";
import { openConfirmationDialog } from "./confirmationDialog.svelte.js";
import { openRenameDialog } from "./renameDialog.svelte.js";
import { openCreateFolderDialog } from "./createFolderDialog.svelte.js";
import { openFilePreviewDialog } from "./filePreviewDialog.svelte.js";
import { uploadFiles, createFolder } from "$lib/file-operations.js";

// Global state management
export let selectedItems = $state<FileItem[]>([]);
export let lastSelectedIndex = $state<{ value: number | null }>({
  value: null,
});
export let isUploading = $state({ value: false });
export let isDownloading = $state({ value: false });

// Clipboard management
export let fileClipboard = $state<{
  data: FileItem[];
  operation: "cut" | "copy" | null;
}>({
  data: [],
  operation: null,
});

// Current folder state
export let currentFolderId = $state<{ value: string | null }>({ value: null });
export let currentUserId = $state<{ value: string | null }>({ value: null });

// Upload state
export let uploadProgress = $state<{ [key: string]: number }>({});

export const fileOperations = {
  // Item click handlers
  handleItemClick(item: FileItem) {
    if (item.type === "folder") {
      goto(`/${item.id}`);
    } else {
      openFilePreviewDialog(item);
    }
  },

  // File operations
  async handleRename(item: FileItem, newName: string) {
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

  async handleDelete(item: FileItem) {
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
        // Remove from selected items if it was selected
        const index = selectedItems.findIndex(
          (selected) => selected.id !== item.id
        );
        if (index > -1) {
          selectedItems.splice(index, 1);
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to delete: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      throw error;
    }
  },

  async handleCreateFolder(name: string) {
    try {
      const success = await createFolder({
        name,
        parentId: currentFolderId.value || undefined,
      });

      if (success) {
        await invalidateAll();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      throw error;
    }
  },

  // File upload operations
  async handleFilesUpload(uploadableFiles: UploadableFile[]) {
    if (isUploading.value) return;

    isUploading.value = true;

    try {
      const success = await uploadFiles(uploadableFiles, {
        folderId: currentFolderId.value || undefined,
        onProgress: (progress) => {
          // Update upload progress if needed
        },
        onError: (error) => {
          alert("Upload failed: " + error);
        },
        onSuccess: () => {
          // Upload completed successfully
        },
      });

      if (success) {
        await invalidateAll();
      }
    } catch (error) {
      alert("Error uploading files");
    } finally {
      isUploading.value = false;
    }
  },

  // Download operations
  downloadFile(item: FileItem) {
    if (item.storageKey) {
      window.open(
        `/api/storage?key=${encodeURIComponent(item.storageKey)}&download=true`,
        "_blank"
      );
    }
  },

  // Action handler - central dispatcher for all file actions
  handleAction(action: FileAction, item: FileItem) {
    switch (action) {
      case "open":
        fileOperations.handleItemClick(item);
        break;
      case "download":
        fileOperations.downloadFile(item);
        break;
      case "rename":
        openRenameDialog(item, (newName: string) =>
          fileOperations.handleRename(item, newName)
        );
        break;
      case "delete":
        openConfirmationDialog(
          {
            title: `Delete ${item.type}`,
            description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "destructive",
          },
          () => fileOperations.handleDelete(item)
        );
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  },

  // Selection management
  toggleSelection(
    item: FileItem,
    index: number,
    isShiftClick: boolean = false,
    isCtrlClick: boolean = false
  ) {
    if (isShiftClick && lastSelectedIndex.value !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex.value, index);
      const end = Math.max(lastSelectedIndex.value, index);
      // This would need the full items array to work properly
      // For now, just add the current item
      if (!selectedItems.find((selected) => selected.id === item.id)) {
        selectedItems.push(item);
      }
    } else if (isCtrlClick) {
      // Toggle individual item
      const existingIndex = selectedItems.findIndex(
        (selected) => selected.id === item.id
      );
      if (existingIndex >= 0) {
        selectedItems.splice(existingIndex, 1);
      } else {
        selectedItems.push(item);
      }
    } else {
      // Single selection
      selectedItems.splice(0, selectedItems.length, item);
    }

    lastSelectedIndex.value = index;
  },

  selectAll(items: FileItem[]) {
    selectedItems.splice(0, selectedItems.length, ...items);
    lastSelectedIndex.value = items.length > 0 ? items.length - 1 : null;
  },

  clearSelection() {
    selectedItems.length = 0;
    lastSelectedIndex.value = null;
  },

  // Clipboard operations
  cutItems(items: FileItem[]) {
    fileClipboard.data = [...items];
    fileClipboard.operation = "cut";
  },

  copyItems(items: FileItem[]) {
    fileClipboard.data = [...items];
    fileClipboard.operation = "copy";
  },

  async pasteItems() {
    if (fileClipboard.data.length === 0) return;

    try {
      // Implementation depends on your backend API for move/copy operations
      // For now, just clear clipboard after paste
      fileClipboard.data = [];
      fileClipboard.operation = null;
      await invalidateAll();
    } catch (error) {
      console.error("Failed to paste items:", error);
      throw error;
    }
  },

  // Bulk operations
  async bulkDelete() {
    if (selectedItems.length === 0) return;

    openConfirmationDialog(
      {
        title: `Delete ${selectedItems.length} items`,
        description: `Are you sure you want to delete ${selectedItems.length} selected items? This action cannot be undone.`,
        confirmText: "Delete All",
        cancelText: "Cancel",
        variant: "destructive",
      },
      async () => {
        try {
          await Promise.all(
            selectedItems.map((item) => fileOperations.handleDelete(item))
          );
          selectedItems.length = 0;
          lastSelectedIndex.value = null;
        } catch (error) {
          console.error("Failed to delete items:", error);
        }
      }
    );
  },

  async bulkDownload() {
    if (selectedItems.length === 0) return;

    isDownloading.value = true;
    try {
      // Download each file individually for now
      // Could be enhanced to create a zip file
      selectedItems
        .filter((item) => item.type === "file")
        .forEach((item) => fileOperations.downloadFile(item));
    } finally {
      isDownloading.value = false;
    }
  },

  // Context menu actions
  handleContextMenuAction(action: string, item?: FileItem) {
    switch (action) {
      case "upload":
        // Trigger file input
        document
          .querySelector<HTMLInputElement>(
            'input[type="file"]:not([webkitdirectory])'
          )
          ?.click();
        break;
      case "upload-folder":
        // Trigger folder input
        document
          .querySelector<HTMLInputElement>(
            'input[type="file"][webkitdirectory]'
          )
          ?.click();
        break;
      case "refresh":
        invalidateAll();
        break;
      case "select-all":
        // This would need the full items array
        break;
      case "deselect-all":
        fileOperations.clearSelection();
        break;
      case "create-folder":
        openCreateFolderDialog((name: string) =>
          fileOperations.handleCreateFolder(name)
        );
        break;
      default:
        if (item && action) {
          fileOperations.handleAction(action as FileAction, item);
        }
        break;
    }
  },

  // State setters
  setCurrentFolder(folderId: string | null) {
    currentFolderId.value = folderId;
  },

  setCurrentUser(userId: string | null) {
    currentUserId.value = userId;
  },
};
