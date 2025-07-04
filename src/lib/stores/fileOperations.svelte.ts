import { invalidateAll, goto } from "$app/navigation";
import type { FileItem, FileAction, UploadableFile } from "$lib/types/file.js";
import { openConfirmationDialog } from "./confirmationDialog.svelte.js";
import { openRenameDialog } from "./renameDialog.svelte.js";
import { openCreateFolderDialog } from "./createFolderDialog.svelte.js";
import { openFilePreviewDialog } from "./filePreviewDialog.svelte.js";
import { toast } from "svelte-sonner";

export interface UploadOptions {
  folderId?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export interface CreateFolderOptions {
  name: string;
  parentId?: string;
}

export let selectedItems = $state<FileItem[]>([]);
export let lastSelectedIndex = $state<{ value: number | null }>({
  value: null,
});
export let isUploading = $state({ value: false });
export let isDownloading = $state({ value: false });

export let fileClipboard = $state<{
  data: FileItem[];
  operation: "cut" | "copy" | null;
}>({
  data: [],
  operation: null,
});

export let currentFolderId = $state<{ value: string | null }>({ value: null });
export let currentUserId = $state<{ value: string | null }>({ value: null });

export let uploadProgress = $state<{ [key: string]: number }>({});

export const fileOperations = {
  handleItemClick(item: FileItem) {
    if (item.type === "folder") {
      goto(`/${item.id}`);
    } else {
      openFilePreviewDialog(item);
    }
  },

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

  async handleFilesUpload(uploadableFiles: UploadableFile[]) {
    if (isUploading.value) return;

    try {
      const success = await uploadFiles(uploadableFiles, {
        folderId: currentFolderId.value || undefined,
        onProgress: (progress) => {},
        onError: (error) => {
          toast.error("Failed to upload files: " + error);
        },
        onSuccess: () => {
          toast.success("Files uploaded successfully!");
        },
      });

      if (success) {
        await invalidateAll();
      }
    } catch (error) {
      toast.error(
        "Failed to upload files: " +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    } finally {
      isUploading.value = false;
    }
  },

  downloadFile(item: FileItem) {
    if (item.storageKey) {
      window.open(
        `/api/files/${encodeURIComponent(item.storageKey)}?download=true`,
        "_blank"
      );
    }
  },

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

  selectAll(items: FileItem[]) {
    selectedItems.splice(0, selectedItems.length, ...items);
    lastSelectedIndex.value = items.length > 0 ? items.length - 1 : null;
  },

  clearSelection() {
    selectedItems.length = 0;
    lastSelectedIndex.value = null;
  },

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
      fileClipboard.data = [];
      fileClipboard.operation = null;
      await invalidateAll();
    } catch (error) {
      console.error("Failed to paste items:", error);
      throw error;
    }
  },

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
      // TODO: Implement bulk download logic (ZIP)
      selectedItems
        .filter((item) => item.type === "file")
        .forEach((item) => fileOperations.downloadFile(item));
    } finally {
      isDownloading.value = false;
    }
  },

  handleContextMenuAction(action: string, item?: FileItem) {
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

  setCurrentFolder(folderId: string | null) {
    currentFolderId.value = folderId;
  },

  setCurrentUser(userId: string | null) {
    currentUserId.value = userId;
  },
};

async function createFolder(options: CreateFolderOptions): Promise<boolean> {
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
}
async function uploadFiles(
  files: UploadableFile[],
  options: UploadOptions = {}
): Promise<boolean> {
  if (isUploading.value) {
    return false;
  }

  isUploading.value = true;

  try {
    const formData = new FormData();

    files.forEach((uploadFile) => {
      formData.append("files", uploadFile.file);
      formData.append(
        "relativePaths",
        uploadFile.relativePath || uploadFile.name
      );
    });

    if (options.folderId) {
      formData.append("folderId", options.folderId);
    }

    const response = await fetch("/api/files/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      await invalidateAll();
      options.onSuccess?.();
      return true;
    } else {
      const error = await response.text();
      options.onError?.(error);
      return false;
    }
  } catch (error) {
    options.onError?.("Error uploading files");
    return false;
  }
}
