import { invalidateAll } from "$app/navigation";
import type { UploadableFile } from "$lib/types/file.js";
import { isUploading } from "./fileState.svelte.js";
import { toast } from "svelte-sonner";

export interface UploadOptions {
  folderId?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

/**
 * File upload utilities
 */
export const uploadUtils = {
  /**
   * Upload multiple files
   */
  async uploadFiles(
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
    } finally {
      isUploading.value = false;
    }
  },

  /**
   * Handle file upload from file input
   */
  async handleFilesUpload(
    uploadableFiles: UploadableFile[],
    folderId?: string | null
  ): Promise<void> {
    if (isUploading.value) return;

    try {
      const success = await this.uploadFiles(uploadableFiles, {
        folderId: folderId || undefined,
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
    }
  },
};
