import type { FileItem } from "$lib/types/file.js";

export interface FilePreviewDialogState {
  open: boolean;
  file: FileItem | null;
}

export const filePreviewDialogData = $state<FilePreviewDialogState>({
  open: false,
  file: null,
});

export function openFilePreviewDialog(file: FileItem) {
  filePreviewDialogData.open = true;
  filePreviewDialogData.file = file;
}

export function closeFilePreviewDialog() {
  filePreviewDialogData.open = false;
  filePreviewDialogData.file = null;
}
