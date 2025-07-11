import { createUrlStateManager } from "./urlStateHelper.js";

export interface CreateFolderDialogState {
  open: boolean;
  callback: ((name: string) => Promise<void>) | null;
}

const urlStateManager = createUrlStateManager({
  paramName: "createFolder",
  stateName: "createFolderDialog",
});

export const createFolderDialogData = $state<CreateFolderDialogState>({
  open: false,
  callback: null,
});

export function openCreateFolderDialog(
  callback: (name: string) => Promise<void>
) {
  createFolderDialogData.open = true;
  createFolderDialogData.callback = callback;
  urlStateManager.pushUrlState("new-folder");
}

export function closeCreateFolderDialog() {
  createFolderDialogData.open = false;
  createFolderDialogData.callback = null;
  urlStateManager.clearUrlState();
}

export function initCreateFolderFromUrl() {
  const folderId = urlStateManager.getFileIdFromUrl();
  if (folderId) {
    openCreateFolderDialog(async () => {});
  }
}

export function handleCreateFolderUrlChange() {
  const folderId = urlStateManager.getFileIdFromUrl();

  if (!folderId && createFolderDialogData.open) {
    createFolderDialogData.open = false;
    createFolderDialogData.callback = null;
  } else if (folderId && !createFolderDialogData.open) {
    initCreateFolderFromUrl();
  }
}
