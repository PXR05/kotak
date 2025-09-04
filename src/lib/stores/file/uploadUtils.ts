import type { UploadableFile } from "$lib/types/file.js";
import { isUploading } from "./fileState.svelte.js";
import { uploadProgressStore } from "./uploadProgress.svelte.js";
import { toast } from "svelte-sonner";
import { getFolderChildren } from "$lib/remote/folders.remote";
import { getRootItems } from "$lib/remote/load.remote";

export interface FileProgress {
  fileName: string;
  progress: number;
  status:
    | "pending"
    | "uploading"
    | "completed"
    | "error"
    | "queued"
    | "cancelled";
  error?: string;
  storageKey?: string;
}

export interface UploadProgress {
  overallProgress: number;
  currentFile?: string;
  filesCompleted: number;
  totalFiles: number;
  fileProgresses: Map<string, FileProgress>;
}

export interface UploadOptions {
  folderId?: string;
  batchSize?: number;
  onProgress?: (progress: UploadProgress) => void;
  onFileProgress?: (fileProgress: number, fileName: string) => void;
  onFileStart?: () => void;
  onFileComplete?: (success: boolean) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

interface QueuedUpload {
  files: UploadableFile[];
  options: UploadOptions;
}

const uploadQueue: QueuedUpload[] = [];
let isProcessingQueue = false;

const activeXHRUploads = new Map<string, XMLHttpRequest>();
const fileStorageKeys = new Map<string, string>();

async function uploadSingleFile(
  uploadFile: UploadableFile,
  options: UploadOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    options.onFileStart?.();

    const storageKey = crypto.randomUUID();
    fileStorageKeys.set(uploadFile.name, storageKey);

    const formData = new FormData();
    formData.append(
      "relativePaths",
      uploadFile.relativePath || uploadFile.name
    );
    formData.append("storageKey", storageKey);

    if (options.folderId) {
      formData.append("folderId", options.folderId);
    }

    formData.append("files", uploadFile.file);

    const xhr = new XMLHttpRequest();

    activeXHRUploads.set(uploadFile.name, xhr);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const fileProgress = (event.loaded / event.total) * 100;
        options.onFileProgress?.(fileProgress, uploadFile.name);
      }
    });

    xhr.addEventListener("load", () => {
      activeXHRUploads.delete(uploadFile.name);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          fileStorageKeys.delete(uploadFile.name);
          options.onFileComplete?.(true);
          resolve(true);
        } catch (error) {
          console.error("Failed to parse upload response:", error);
          options.onFileComplete?.(false);
          resolve(false);
        }
      } else {
        const error = `Failed to upload ${uploadFile.name}: ${xhr.responseText}`;
        options.onError?.(error);
        options.onFileComplete?.(false);
        resolve(false);
      }
    });

    xhr.addEventListener("error", () => {
      activeXHRUploads.delete(uploadFile.name);
      const error = `Network error uploading ${uploadFile.name}`;
      options.onError?.(error);
      options.onFileComplete?.(false);
      resolve(false);
    });

    xhr.addEventListener("timeout", () => {
      activeXHRUploads.delete(uploadFile.name);
      const error = `Timeout uploading ${uploadFile.name}`;
      options.onError?.(error);
      options.onFileComplete?.(false);
      resolve(false);
    });

    xhr.addEventListener("abort", () => {
      activeXHRUploads.delete(uploadFile.name);
      options.onFileComplete?.(false);
      resolve(false);
    });

    xhr.timeout = 300000; // 5 minutes

    xhr.open("POST", "/api/files/upload");
    xhr.send(formData);
  });
}

async function cleanupAbortedFiles(fileNames: string[]) {
  const storageKeysToClean = fileNames
    .map((fileName) => fileStorageKeys.get(fileName))
    .filter(Boolean);

  if (storageKeysToClean.length === 0) return;

  try {
    const response = await fetch("/api/files/abort", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storageKeys: storageKeysToClean,
      }),
    });

    if (!response.ok) {
      console.error("Failed to cleanup aborted files:", await response.text());
    } else {
      const result = await response.json();
      console.log("Cleanup completed:", result);
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }

  fileNames.forEach((fileName) => fileStorageKeys.delete(fileName));
}

async function processUploadQueue() {
  if (isProcessingQueue || uploadQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (uploadQueue.length > 0) {
    const queuedUpload = uploadQueue.shift()!;
    await uploadFilesInternal(queuedUpload.files, queuedUpload.options);
  }

  isProcessingQueue = false;
}

async function uploadFilesInternal(
  files: UploadableFile[],
  options: UploadOptions = {}
): Promise<boolean> {
  isUploading.value = true;
  let successCount = 0;
  let completedCount = 0;
  const totalFiles = files.length;
  const batchSize = options.batchSize || 3;

  const { folderId } = options;

  const fileProgresses = new Map<string, FileProgress>();
  files.forEach((file) => {
    fileProgresses.set(file.name, {
      fileName: file.name,
      progress: 0,
      status: "pending",
    });
  });

  async function refreshFolder(folderId: string | undefined) {
    if (!folderId || folderId.startsWith("root-")) {
      await getRootItems().refresh();
    } else {
      await getFolderChildren(folderId).refresh();
    }
  }

  function updateProgress(currentFile?: string) {
    const overallProgress =
      totalFiles > 0 ? (completedCount / totalFiles) * 100 : 0;
    const progressData: UploadProgress = {
      overallProgress,
      currentFile,
      filesCompleted: successCount,
      totalFiles,
      fileProgresses: new Map(fileProgresses),
    };

    if (completedCount === 0) {
      uploadProgressStore.show(progressData);
    } else {
      uploadProgressStore.update(progressData);
    }

    options.onProgress?.(progressData);
  }

  try {
    updateProgress();

    const pendingFiles = [...files];
    const activeUploads = new Set<Promise<boolean>>();

    async function processFile(uploadFile: UploadableFile): Promise<boolean> {
      const fileProgress = fileProgresses.get(uploadFile.name)!;
      fileProgress.status = "uploading";
      updateProgress(uploadFile.name);

      const success = await uploadSingleFile(uploadFile, {
        folderId: options.folderId,
        onFileProgress: (progress, fileName) => {
          const fileProgress = fileProgresses.get(fileName)!;
          fileProgress.progress = progress;
          updateProgress(fileName);
          options.onFileProgress?.(progress, fileName);
        },
        onFileStart: () => {
          const fileProgress = fileProgresses.get(uploadFile.name)!;
          fileProgress.status = "uploading";
          fileProgress.progress = 0;
          options.onFileStart?.();
        },
        onFileComplete: (success) => {
          const fileProgress = fileProgresses.get(uploadFile.name)!;
          const wasAborted = !activeXHRUploads.has(uploadFile.name) && !success;
          if (wasAborted && fileProgress.status === "uploading") {
            fileProgress.status = "cancelled";
            fileProgress.progress = 0;
          } else {
            fileProgress.status = success ? "completed" : "error";
            fileProgress.progress = success ? 100 : 0;
          }
          if (success) successCount++;
          completedCount++;
          options.onFileComplete?.(success);
        },
        onError: (error) => {
          const fileProgress = fileProgresses.get(uploadFile.name)!;
          fileProgress.status = "error";
          fileProgress.error = error;
          options.onError?.(error);
        },
      });

      return success;
    }

    while (pendingFiles.length > 0 || activeUploads.size > 0) {
      while (activeUploads.size < batchSize && pendingFiles.length > 0) {
        const file = pendingFiles.shift()!;
        const uploadPromise = processFile(file);
        activeUploads.add(uploadPromise);

        uploadPromise.finally(() => {
          activeUploads.delete(uploadPromise);
        });
      }

      if (activeUploads.size > 0) {
        await Promise.race(activeUploads);
        updateProgress();
      }
    }

    updateProgress();
    await refreshFolder(folderId);

    if (successCount > 0) {
      if (successCount === totalFiles) {
        options.onSuccess?.();
        await refreshFolder(folderId);
      }
      return successCount === totalFiles;
    } else {
      return false;
    }
  } catch (error) {
    options.onError?.("Error uploading files");
    return false;
  } finally {
    isUploading.value = false;

    setTimeout(() => processUploadQueue(), 100);
  }
}

function getQueueStatus(): {
  queuedFiles: UploadableFile[];
  totalQueued: number;
} {
  const queuedFiles = uploadQueue.flatMap((item) => item.files);
  return {
    queuedFiles,
    totalQueued: queuedFiles.length,
  };
}

export const uploadUtils = {
  async uploadFiles(
    files: UploadableFile[],
    options: UploadOptions = {}
  ): Promise<boolean> {
    if (isUploading.value || isProcessingQueue) {
      uploadQueue.push({ files, options });

      const queueStatus = getQueueStatus();
      const currentProgress = uploadProgressStore.uploadProgress;

      if (currentProgress) {
        const allFiles = new Map(currentProgress.fileProgresses);

        queueStatus.queuedFiles.forEach((file) => {
          allFiles.set(file.name, {
            fileName: file.name,
            progress: 0,
            status: "queued",
          });
        });

        const updatedProgress: UploadProgress = {
          ...currentProgress,
          totalFiles: currentProgress.totalFiles + queueStatus.totalQueued,
          fileProgresses: allFiles,
        };

        uploadProgressStore.update(updatedProgress);
      }

      toast.info(`Added ${files.length} files to upload queue`);
      return true;
    }

    return uploadFilesInternal(files, options);
  },

  async handleFilesUpload(
    uploadableFiles: UploadableFile[],
    folderId?: string | null,
    batchSize?: number
  ): Promise<void> {
    try {
      await this.uploadFiles(uploadableFiles, {
        folderId: folderId || undefined,
        batchSize: batchSize || 3,
        onError: (error) => toast.error(error),
        onSuccess: () => toast.success("Files uploaded successfully!"),
      });
    } catch (error) {
      toast.error(
        "Failed to upload files: " +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  },

  async abortUpload(fileName: string) {
    const xhr = activeXHRUploads.get(fileName);
    if (xhr) {
      xhr.abort();
      activeXHRUploads.delete(fileName);

      await cleanupAbortedFiles([fileName]);

      toast.info(`Upload cancelled: ${fileName}`);
    }
  },

  isFileUploading(fileName: string): boolean {
    return activeXHRUploads.has(fileName);
  },

  getQueueInfo() {
    return getQueueStatus();
  },

  clearQueue() {
    uploadQueue.length = 0;
  },
};
