import type { FileItem } from "$lib/types/file.js";
import { createUrlStateManager } from "./urlStateHelper.js";

export interface FilePreviewDialogState {
  open: boolean;
  file: FileItem | null;
  fileList: FileItem[];
  currentIndex: number;
}

export const filePreviewDialogData = $state<FilePreviewDialogState>({
  open: false,
  file: null,
  fileList: [],
  currentIndex: 0,
});

const urlStateManager = createUrlStateManager({
  paramName: "preview",
  stateName: "filePreview",
  indexParam: "index",
});

export function openFilePreviewDialog(
  file: FileItem,
  fileList: FileItem[] = [],
  currentIndex: number = 0
) {
  filePreviewDialogData.open = true;
  filePreviewDialogData.file = file;
  filePreviewDialogData.fileList = fileList;
  filePreviewDialogData.currentIndex = currentIndex;

  urlStateManager.pushUrlState(file.id, {
    currentIndex: fileList.length > 1 ? currentIndex : undefined,
    fileList: fileList.map((f) => ({ id: f.id, name: f.name })),
  });
}

export function closeFilePreviewDialog() {
  filePreviewDialogData.open = false;
  filePreviewDialogData.file = null;
  filePreviewDialogData.fileList = [];
  filePreviewDialogData.currentIndex = 0;

  urlStateManager.clearUrlState();
}

export function initPreviewFromUrl(currentFileList: FileItem[] = []) {
  const previewFileId = urlStateManager.getFileIdFromUrl();
  const indexParam = urlStateManager.getIndexFromUrl();

  if (previewFileId) {
    const file = urlStateManager.findFileById(previewFileId, currentFileList);
    if (file) {
      const currentIndex = indexParam !== null ? indexParam : 0;
      filePreviewDialogData.open = true;
      filePreviewDialogData.file = file;
      filePreviewDialogData.fileList = currentFileList;
      filePreviewDialogData.currentIndex = Math.max(
        0,
        Math.min(currentIndex, currentFileList.length - 1)
      );
    }
  }
}

export function handleUrlChange(currentFileList: FileItem[] = []) {
  const previewFileId = urlStateManager.getFileIdFromUrl();

  if (!previewFileId && filePreviewDialogData.open) {
    filePreviewDialogData.open = false;
    filePreviewDialogData.file = null;
    filePreviewDialogData.fileList = [];
    filePreviewDialogData.currentIndex = 0;
  } else if (previewFileId && !filePreviewDialogData.open) {
    initPreviewFromUrl(currentFileList);
  }
}

export function navigateToFile(newIndex: number) {
  if (
    !filePreviewDialogData.open ||
    newIndex < 0 ||
    newIndex >= filePreviewDialogData.fileList.length
  ) {
    return;
  }

  const newFile = filePreviewDialogData.fileList[newIndex];
  filePreviewDialogData.file = newFile;
  filePreviewDialogData.currentIndex = newIndex;

  urlStateManager.replaceUrlState(newFile.id, {
    currentIndex:
      filePreviewDialogData.fileList.length > 1 ? newIndex : undefined,
    fileList: filePreviewDialogData.fileList.map((f) => ({
      id: f.id,
      name: f.name,
    })),
  });
}
