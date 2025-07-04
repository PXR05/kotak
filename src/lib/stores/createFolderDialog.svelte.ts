export interface CreateFolderDialogState {
  open: boolean;
  callback: ((name: string) => Promise<void>) | null;
}

export const createFolderDialogData = $state<CreateFolderDialogState>({
  open: false,
  callback: null,
});

export function openCreateFolderDialog(
  callback: (name: string) => Promise<void>
) {
  createFolderDialogData.open = true;
  createFolderDialogData.callback = callback;
}

export function closeCreateFolderDialog() {
  createFolderDialogData.open = false;
  createFolderDialogData.callback = null;
}
