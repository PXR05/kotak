import type { FileItem } from "$lib/types/file.js";

export interface MoveDialogState {
  open: boolean;
  items: FileItem[];
  callback: ((targetFolderId: string | null) => Promise<void>) | null;
}

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
}

export function closeMoveDialog() {
  moveDialogData.open = false;
  moveDialogData.items = [];
  moveDialogData.callback = null;
}
