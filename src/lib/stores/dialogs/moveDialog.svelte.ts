import type { FileItem } from "$lib/types/file.js";
import { createUrlStateManager } from "./urlStateHelper.js";

export interface MoveDialogState {
  open: boolean;
  items: FileItem[];
  callback: ((targetFolderId: string | null) => Promise<void>) | null;
}

const urlStateManager = createUrlStateManager({
  paramName: "move",
  stateName: "moveDialog",
});

export const moveDialogData = $state<MoveDialogState>({
  open: false,
  items: [],
  callback: null,
});

export function openMoveDialog(
  items: FileItem[],
  callback: (targetFolderId: string | null) => Promise<void>
) {
  moveDialogData.open = true;
  moveDialogData.items = [...items];
  moveDialogData.callback = callback;

  if (items.length > 0) {
    urlStateManager.pushUrlState(items[0].id, { itemCount: items.length });
  }
}

export function closeMoveDialog() {
  moveDialogData.open = false;
  moveDialogData.items = [];
  moveDialogData.callback = null;
  urlStateManager.clearUrlState();
}

export function initMoveFromUrl(currentFileList: FileItem[] = []) {
  const fileId = urlStateManager.getFileIdFromUrl();
  if (fileId) {
    const file = urlStateManager.findFileById(fileId, currentFileList);
    if (file) {
      openMoveDialog([file], async () => {});
    }
  }
}

export function handleMoveUrlChange(currentFileList: FileItem[] = []) {
  const fileId = urlStateManager.getFileIdFromUrl();

  if (!fileId && moveDialogData.open) {
    moveDialogData.open = false;
    moveDialogData.items = [];
    moveDialogData.callback = null;
  } else if (fileId && !moveDialogData.open) {
    initMoveFromUrl(currentFileList);
  }
}
