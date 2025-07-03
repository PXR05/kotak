import {
  EyeIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  Icon,
} from "@lucide/svelte";
import type { FileItem, FileAction } from "$lib/types/file.js";
import { goto } from "$app/navigation";
import { invalidateAll } from "$app/navigation";
import JSZip from "jszip";
import type { ConfirmationConfig } from "./ConfirmationDialog.svelte";

export interface FileActionConfig {
  id: FileAction;
  label: string;
  icon: typeof Icon;
  disabled?: (item: FileItem) => boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

export const fileActions: FileActionConfig[] = [
  {
    id: "open",
    label: "Open",
    icon: EyeIcon,
  },
  {
    id: "download",
    label: "Download",
    icon: DownloadIcon,
  },
  {
    id: "rename",
    label: "Rename",
    icon: EditIcon,
  },
  {
    id: "delete",
    label: "Move to Trash",
    icon: TrashIcon,
    variant: "destructive",
    separator: true,
  },
];

export function getEnabledActions(item: FileItem): FileActionConfig[] {
  return fileActions.filter((action) => !action.disabled?.(item));
}

export function getAllActions(): FileActionConfig[] {
  return fileActions;
}

interface FolderFile {
  id: string;
  name: string;
  storageKey: string;
  size: number;
  mimeType: string;
  path: string;
}

interface FolderContents {
  files: FolderFile[];
  folders: Array<{
    id: string;
    name: string;
    path: string;
    contents: FolderContents;
  }>;
}

async function addFilesToZip(
  zip: JSZip,
  contents: FolderContents,
  basePath: string = ""
): Promise<void> {
  for (const file of contents.files || []) {
    try {
      const response = await fetch(
        `/api/storage?key=${encodeURIComponent(file.storageKey)}&download=true`
      );
      if (response.ok) {
        const blob = await response.blob();
        const filePath = basePath ? `${basePath}/${file.name}` : file.name;
        zip.file(filePath, blob);
      } else {
        // Skip failed downloads
      }
    } catch (error) {
      // Skip failed downloads
    }
  }

  for (const folder of contents.folders || []) {
    const folderPath = basePath ? `${basePath}/${folder.name}` : folder.name;
    await addFilesToZip(zip, folder.contents, folderPath);
  }
}

async function downloadFolder(item: FileItem): Promise<void> {
  try {
    const response = await fetch(`/api/folders/${item.id}/contents`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch folder contents: ${response.statusText}`
      );
    }

    const contents = await response.json();

    const zip = new JSZip();

    await addFilesToZip(zip, contents);

    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      alert("This folder is empty or contains no downloadable files.");
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
    link.download = `${item.name}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(
      `Failed to download folder: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export interface FileActionHandlers {
  onItemClick?: (item: FileItem) => void;
  onPreviewOpen?: (item: FileItem) => void;
  onAfterDelete?: (item: FileItem) => void;
  onConfirm?: (config: ConfirmationConfig, onConfirm: () => void) => void;
  onRename?: (
    item: FileItem,
    onRename: (newName: string) => Promise<void>
  ) => void;
}

export function createFileActionHandler(handlers: FileActionHandlers = {}) {
  return async function handleAction(action: FileAction, item: FileItem) {
    switch (action) {
      case "open":
        if (item.type === "folder") {
          goto(`/${item.id}`);
        } else {
          handlers.onPreviewOpen?.(item) || handlers.onItemClick?.(item);
        }
        break;

      case "download":
        if (item.type === "file" && item.storageKey) {
          window.open(
            `/api/storage?key=${item.storageKey}&download=true`,
            "_blank"
          );
        } else if (item.type === "folder") {
          await downloadFolder(item);
        }
        break;

      case "rename":
        const performRename = async (newName: string): Promise<void> => {
          try {
            let response;

            if (item.type === "folder") {
              response = await fetch(`/api/folders/${item.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: newName }),
              });
            } else {
              response = await fetch(`/api/storage?key=${item.storageKey}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: newName }),
              });
            }

            if (response.ok) {
              await invalidateAll();
            } else {
              const errorText = await response.text();
              throw new Error(`Failed to rename ${item.type}: ${errorText}`);
            }
          } catch (error) {
            throw error;
          }
        };

        if (handlers.onRename) {
          handlers.onRename(item, performRename);
        } else {
          const newName = prompt(`Rename ${item.type}:`, item.name);
          if (newName && newName.trim() !== item.name) {
            try {
              await performRename(newName.trim());
            } catch (error) {
              alert(`Error renaming ${item.type}: ${error}`);
            }
          }
        }
        break;

      case "delete":
        const itemType = item.type === "folder" ? "folder" : "file";
        const confirmConfig: ConfirmationConfig = {
          title: `Delete ${itemType}`,
          description:
            item.type === "folder"
              ? `Are you sure you want to delete the folder "${item.name}" and all its contents? This action cannot be undone.`
              : `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
          confirmText: "Delete",
          cancelText: "Cancel",
          variant: "destructive",
          icon: true,
        };

        const performDelete = async () => {
          try {
            let response;

            if (item.type === "folder") {
              response = await fetch(`/api/folders/${item.id}`, {
                method: "DELETE",
              });
            } else {
              response = await fetch(`/api/storage?key=${item.storageKey}`, {
                method: "DELETE",
              });
            }

            if (response.ok) {
              await invalidateAll();
              handlers.onAfterDelete?.(item);
              console.log(`${itemType} "${item.name}" deleted successfully`);
            } else {
              const errorText = await response.text();
              console.error(`Failed to delete ${itemType}:`, errorText);
              alert(`Failed to delete ${itemType}: ${errorText}`);
            }
          } catch (error) {
            console.error(`Error deleting ${itemType}:`, error);
            alert(`Error deleting ${itemType}: ${error}`);
          }
        };

        if (handlers.onConfirm) {
          handlers.onConfirm(confirmConfig, performDelete);
        } else {
          if (confirm(confirmConfig.description)) {
            await performDelete();
          }
        }
        break;

      default:
        console.log("Unknown action:", action);
    }
  };
}
