import type { FileItem } from "$lib/types/file.js";

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

export function openFilePreviewDialog(
  file: FileItem,
  fileList: FileItem[] = [],
  currentIndex: number = 0
) {
  filePreviewDialogData.open = true;
  filePreviewDialogData.file = file;
  filePreviewDialogData.fileList = fileList;
  filePreviewDialogData.currentIndex = currentIndex;
}

export function closeFilePreviewDialog() {
  filePreviewDialogData.open = false;
  filePreviewDialogData.file = null;
  filePreviewDialogData.fileList = [];
  filePreviewDialogData.currentIndex = 0;
}
