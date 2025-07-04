import type { UploadableFile } from "./types/file.js";
import { invalidateAll } from "$app/navigation";
import { isUploading } from "./stores/fileOperations.svelte.js";

export interface UploadOptions {
  folderId?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export async function uploadFiles(
  files: UploadableFile[],
  options: UploadOptions = {}
): Promise<boolean> {
  // Check if already uploading using global state
  if (isUploading.value) {
    return false;
  }

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

    const response = await fetch("/api/storage", {
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

export function createFileInput(
  options: {
    multiple?: boolean;
    directory?: boolean;
    accept?: string;
  } = {}
): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";

    if (options.multiple) {
      input.multiple = true;
    }

    if (options.directory) {
      input.webkitdirectory = true;
    }

    if (options.accept) {
      input.accept = options.accept;
    }

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      resolve(files);
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}

export function convertFilesToUploadable(files: FileList): UploadableFile[] {
  return Array.from(files).map((file) => {
    const webkitPath = (file as any).webkitRelativePath;
    return {
      file,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      relativePath:
        webkitPath && webkitPath !== file.name ? webkitPath : undefined,
    };
  });
}

export async function processDroppedItems(
  items: DataTransferItemList
): Promise<UploadableFile[]> {
  const uploadableFiles: UploadableFile[] = [];

  await Promise.all(
    Array.from(items).map(async (item) => {
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await processEntry(entry, uploadableFiles);
        }
      }
    })
  );

  return uploadableFiles;
}

async function processEntry(
  entry: FileSystemEntry,
  uploadableFiles: UploadableFile[],
  path = ""
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise<void>((resolve) => {
      fileEntry.file((file) => {
        const relativePath = path ? `${path}/${file.name}` : file.name;
        uploadableFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          relativePath,
        });
        resolve();
      });
    });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const dirPath = path ? `${path}/${entry.name}` : entry.name;

    return new Promise<void>((resolve) => {
      const reader = dirEntry.createReader();
      reader.readEntries(async (entries) => {
        await Promise.all(
          entries.map((childEntry) =>
            processEntry(childEntry, uploadableFiles, dirPath)
          )
        );
        resolve();
      });
    });
  }
}

export function downloadFile(storageKey: string): void {
  window.open(
    `/api/storage?key=${encodeURIComponent(storageKey)}&download=true`,
    "_blank"
  );
}

export interface CreateFolderOptions {
  name: string;
  parentId?: string;
}

export async function createFolder(
  options: CreateFolderOptions
): Promise<boolean> {
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
