import type { UploadableFile } from "$lib/types/file.js";
import { isUploading } from "./fileState.svelte.js";
import { uploadProgressStore } from "./uploadProgress.svelte.js";
import { toast } from "svelte-sonner";
import { getFolderChildren } from "$lib/remote/folders.remote";
import { getRootItems } from "$lib/remote/load.remote";

export interface FileProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "queued";
  error?: string;
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

async function uploadSingleFile(
  uploadFile: UploadableFile,
  options: UploadOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    options.onFileStart?.();

    const formData = new FormData();
    formData.append(
      "relativePaths",
      uploadFile.relativePath || uploadFile.name
    );

    if (options.folderId) {
      formData.append("folderId", options.folderId);
    }

    formData.append("files", uploadFile.file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const fileProgress = (event.loaded / event.total) * 100;
        options.onFileProgress?.(fileProgress, uploadFile.name);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
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
      const error = `Network error uploading ${uploadFile.name}`;
      options.onError?.(error);
      options.onFileComplete?.(false);
      resolve(false);
    });

    xhr.addEventListener("timeout", () => {
      const error = `Timeout uploading ${uploadFile.name}`;
      options.onError?.(error);
      options.onFileComplete?.(false);
      resolve(false);
    });

    xhr.timeout = 300000; // 5 minutes

    xhr.open("POST", "/api/files");
    xhr.send(formData);
  });
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

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchPromises = batch.map(async (uploadFile) => {
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
            fileProgress.status = success ? "completed" : "error";
            fileProgress.progress = success ? 100 : 0;
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
      });

      await Promise.all(batchPromises);

      updateProgress();

      await refreshFolder(folderId);
    }

    updateProgress();

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
        batchSize: batchSize || 3, // Default to 3 concurrent uploads
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

  getQueueInfo() {
    return getQueueStatus();
  },

  clearQueue() {
    uploadQueue.length = 0;
  },
};
