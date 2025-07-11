import type { FileItem } from "$lib/types/file.js";
import { createUrlStateManager } from "./urlStateHelper.js";

export interface RenameDialogState {
  open: boolean;
  item: FileItem | null;
  callback: ((newName: string) => Promise<void>) | null;
}

const urlStateManager = createUrlStateManager({
  paramName: "rename",
  stateName: "renameDialog",
});

export const renameDialogData = $state<RenameDialogState>({
  open: false,
  item: null,
  callback: null,
});

export function openRenameDialog(
  item: FileItem,
  callback: (newName: string) => Promise<void>
) {
  renameDialogData.open = true;
  renameDialogData.item = item;
  renameDialogData.callback = callback;
  urlStateManager.pushUrlState(item.id);
}

export function closeRenameDialog() {
  renameDialogData.open = false;
  renameDialogData.item = null;
  renameDialogData.callback = null;
  urlStateManager.clearUrlState();
}

export function initRenameFromUrl(currentFileList: FileItem[] = []) {
  const fileId = urlStateManager.getFileIdFromUrl();
  if (fileId) {
    const file = urlStateManager.findFileById(fileId, currentFileList);
    if (file) {
      openRenameDialog(file, async () => {});
    }
  }
}

export function handleRenameUrlChange(currentFileList: FileItem[] = []) {
  const fileId = urlStateManager.getFileIdFromUrl();

  if (!fileId && renameDialogData.open) {
    renameDialogData.open = false;
    renameDialogData.item = null;
    renameDialogData.callback = null;
  } else if (fileId && !renameDialogData.open) {
    initRenameFromUrl(currentFileList);
  }
}
