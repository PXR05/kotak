import type { FileItem } from "$lib/types/file.js";
import { createUrlStateManager } from "./urlStateHelper.js";

export interface InfoDialogState {
  open: boolean;
  file: FileItem | null;
}

const urlStateManager = createUrlStateManager({
  paramName: "info",
  stateName: "infoDialog",
});

export const infoDialogData = $state<InfoDialogState>({
  open: false,
  file: null,
});

export function openInfoDialog(file: FileItem) {
  infoDialogData.open = true;
  infoDialogData.file = file;
  urlStateManager.pushUrlState(file.id);
}

export function closeInfoDialog() {
  infoDialogData.open = false;
  infoDialogData.file = null;
  urlStateManager.clearUrlState();
}

export function initInfoFromUrl(currentFileList: FileItem[] = []) {
  const fileId = urlStateManager.getFileIdFromUrl();
  if (fileId) {
    const file = urlStateManager.findFileById(fileId, currentFileList);
    if (file) {
      infoDialogData.open = true;
      infoDialogData.file = file;
    }
  }
}

export function handleInfoUrlChange(currentFileList: FileItem[] = []) {
  const fileId = urlStateManager.getFileIdFromUrl();

  if (!fileId && infoDialogData.open) {
    infoDialogData.open = false;
    infoDialogData.file = null;
  } else if (fileId && !infoDialogData.open) {
    initInfoFromUrl(currentFileList);
  }
}
