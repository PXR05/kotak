import type { FileItem } from "$lib/types/file.js";
import { isDownloading } from "./fileState.svelte.js";
import { toast } from "svelte-sonner";
import JSZip from "jszip";
import { getFolderChildren } from "$lib/remote/folders.remote.js";

/**
 * Download and ZIP utilities
 */
export const downloadUtils = {
  /**
   * Create and download a ZIP file from multiple items
   */
  async downloadAsZip(items: FileItem[], zipName?: string): Promise<void> {
    try {
      const zip = new JSZip();
      const allFiles: Array<FileItem & { relativePath?: string }> = [];

      for (const item of items) {
        if (item.type === "file") {
          allFiles.push({ ...item, relativePath: item.name });
        } else if (item.type === "folder") {
          const { data: folderFiles, error } = await getFolderChildren(item.id);
          if (error || !folderFiles) {
            toast.error(
              `Failed to fetch folder contents: ${error || "Unknown error"}`
            );
            continue;
          }
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

      this.downloadBlob(
        zipBlob,
        zipName || `files_${new Date().toISOString().split("T")[0]}.zip`
      );

      toast.success(`Downloaded ${fileCount} file(s) successfully`);
    } catch (error) {
      console.error("Failed to create zip download:", error);
      toast.error("Failed to download files");
      throw error;
    }
  },

  /**
   * Download a single file
   */
  async downloadFile(item: FileItem): Promise<void> {
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
        await this.downloadAsZip([item], `${item.name}.zip`);
      }
    } catch (error) {
      console.error("Failed to download item:", error);
      toast.error("Failed to download item");
    } finally {
      isDownloading.value = false;
    }
  },

  /**
   * Download multiple selected items as ZIP
   */
  async bulkDownload(items: FileItem[]): Promise<void> {
    if (items.length === 0) return;

    isDownloading.value = true;
    try {
      await this.downloadAsZip(items);
    } catch (error) {
      console.error("Failed to bulk download:", error);
      toast.error("Failed to download selected items");
    } finally {
      isDownloading.value = false;
    }
  },

  /**
   * Utility to trigger download of a blob
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
