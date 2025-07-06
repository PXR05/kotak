import { invalidateAll, goto } from "$app/navigation";
import type { FileItem, FileAction, UploadableFile } from "$lib/types/file.js";
import { openConfirmationDialog } from "./confirmationDialog.svelte.js";
import { openRenameDialog } from "./renameDialog.svelte.js";
import { openCreateFolderDialog } from "./createFolderDialog.svelte.js";
import { openFilePreviewDialog } from "./filePreviewDialog.svelte.js";
import { openMoveDialog } from "./moveDialog.svelte.js";
import { toast } from "svelte-sonner";
import JSZip from "jszip";

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

export let currentFolderId = $state<{ value: string | null }>({ value: null });
export let currentUserId = $state<{ value: string | null }>({ value: null });

export let uploadProgress = $state<{ [key: string]: number }>({});

interface FileItemWithPath extends FileItem {
  relativePath?: string;
}

async function fetchFolderContentsRecursively(
  folderId: string,
  path = ""
): Promise<FileItemWithPath[]> {
  try {
    const response = await fetch(`/api/folders/${folderId}/children`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch folder contents: ${response.statusText}`
      );
    }

    const contents: FileItem[] = await response.json();
    const allItems: FileItemWithPath[] = [];

    for (const item of contents) {
      if (item.type === "file") {
        allItems.push({
          ...item,
          relativePath: path ? `${path}/${item.name}` : item.name,
        });
      } else if (item.type === "folder") {
        const subItems = await fetchFolderContentsRecursively(
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
}

async function downloadAsZip(items: FileItem[], zipName?: string) {
  try {
    const zip = new JSZip();
    const allFiles: FileItemWithPath[] = [];

    for (const item of items) {
      if (item.type === "file") {
        allFiles.push({ ...item, relativePath: item.name });
      } else if (item.type === "folder") {
        const folderFiles = await fetchFolderContentsRecursively(
          item.id,
          item.name
        );
        allFiles.push(...folderFiles);
      }
    }

    const filesToDownload = allFiles.filter((item) => item.type === "file");

    if (filesToDownload.length === 0) {
      toast.error("No files found to download");
      return;
    }

    await Promise.all(
      filesToDownload.map(async (item) => {
        try {
          if (!item.storageKey) return;

          const response = await fetch(
            `/api/files/${encodeURIComponent(item.storageKey)}?download=true`
          );
          if (!response.ok) return;

          const blob = await response.blob();
          const filePath = item.relativePath || item.name;
          zip.file(filePath, blob);
        } catch (error) {
          console.error(`Failed to download ${item.name}:`, error);
        }
      })
    );

    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      toast.error("No files could be downloaded");
      return;
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      zipName || `files_${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${fileCount} file(s) successfully`);
  } catch (error) {
    console.error("Failed to create zip download:", error);
    toast.error("Failed to download files");
    throw error;
  }
}

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
        onError: (error) => toast.error("Failed to upload files: " + error),
        onSuccess: () => toast.success("Files uploaded successfully!"),
      });

      if (success) await invalidateAll();
    } catch (error) {
      toast.error(
        "Failed to upload files: " +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    } finally {
      isUploading.value = false;
    }
  },

  async downloadFile(item: FileItem) {
    if (isDownloading.value) return;

    isDownloading.value = true;
    try {
      if (item.type === "file") {
        if (item.storageKey) {
          window.open(
            `/api/files/${encodeURIComponent(item.storageKey)}?download=true`,
            "_blank"
          );
        }
      } else if (item.type === "folder") {
        await downloadAsZip([item], `${item.name}.zip`);
      }
    } catch (error) {
      console.error("Failed to download item:", error);
      toast.error("Failed to download item");
    } finally {
      isDownloading.value = false;
    }
  },

  async handleAction(
    action: FileAction,
    item: FileItem,
    callback?: () => void
  ) {
    switch (action) {
      case "open":
        fileOperations.handleItemClick(item);
        break;
      case "download":
        fileOperations.downloadFile(item);
        break;
      case "move":
        openMoveDialog([item], async (targetFolderId: string | null) => {
          await fileOperations.moveItems([item], targetFolderId);
          callback?.();
        });
        break;
      case "rename":
        openRenameDialog(item, async (newName: string) => {
          await fileOperations.handleRename(item, newName);
          callback?.();
        });
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
          async () => {
            await fileOperations.handleDelete(item);
            callback?.();
          }
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

  async moveItems(items: FileItem[], targetFolderId: string | null) {
    try {
      const movePromises = items.map((item) =>
        moveItemToFolder(item, targetFolderId)
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

  async bulkMove() {
    if (selectedItems.length === 0) return;

    openMoveDialog(selectedItems, async (targetFolderId: string | null) => {
      await fileOperations.moveItems(selectedItems, targetFolderId);
      this.clearSelection();
    });
  },

  async bulkDelete() {
    if (selectedItems.length === 0) return;

    const itemCount = selectedItems.length;
    openConfirmationDialog(
      {
        title: `Delete ${itemCount} items`,
        description: `Are you sure you want to delete ${itemCount} selected items? This action cannot be undone.`,
        confirmText: "Delete All",
        cancelText: "Cancel",
        variant: "destructive",
      },
      async () => {
        try {
          const deletePromises = selectedItems.map((item) =>
            fileOperations.handleDelete(item)
          );
          await Promise.all(deletePromises);
          this.clearSelection();
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
      await downloadAsZip(selectedItems);
    } catch (error) {
      console.error("Failed to bulk download:", error);
      toast.error("Failed to download selected items");
    } finally {
      isDownloading.value = false;
    }
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

    const response = await fetch("/api/files", {
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

async function moveItemToFolder(
  item: FileItem,
  targetFolderId: string | null
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  itemName: string;
}> {
  const endpoint =
    item.type === "file" ? `/api/files/${item.id}` : `/api/folders/${item.id}`;

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
}
