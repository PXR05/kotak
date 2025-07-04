import type { FileItem } from "$lib/types/file.js";

export interface RenameDialogState {
  open: boolean;
  item: FileItem | null;
  callback: ((newName: string) => Promise<void>) | null;
}

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
}

export function closeRenameDialog() {
  renameDialogData.open = false;
  renameDialogData.item = null;
  renameDialogData.callback = null;
}
