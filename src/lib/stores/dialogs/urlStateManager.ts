import type { FileItem } from "$lib/types/file.js";
import {
  initPreviewFromUrl,
  handleUrlChange as handlePreviewUrlChange,
} from "./filePreviewDialog.svelte.js";
import { initInfoFromUrl, handleInfoUrlChange } from "./infoDialog.svelte.js";
import {
  initShareFromUrl,
  handleShareUrlChange,
} from "./shareDialog.svelte.js";
import {
  initRenameFromUrl,
  handleRenameUrlChange,
} from "./renameDialog.svelte.js";
import { initMoveFromUrl, handleMoveUrlChange } from "./moveDialog.svelte.js";
import {
  initConfirmationFromUrl,
  handleConfirmationUrlChange,
} from "./confirmationDialog.svelte.js";
import {
  initCreateFolderFromUrl,
  handleCreateFolderUrlChange,
} from "./createFolderDialog.svelte.js";

export function initAllDialogsFromUrl(currentItems: FileItem[]) {
  if (currentItems.length > 0) {
    initPreviewFromUrl(currentItems);
    initInfoFromUrl(currentItems);
    initShareFromUrl(currentItems);
    initRenameFromUrl(currentItems);
    initMoveFromUrl(currentItems);
  }
  initConfirmationFromUrl();
  initCreateFolderFromUrl();
}

export function handleAllUrlChanges(currentItems: FileItem[]) {
  handlePreviewUrlChange(currentItems);
  handleInfoUrlChange(currentItems);
  handleShareUrlChange(currentItems);
  handleRenameUrlChange(currentItems);
  handleMoveUrlChange(currentItems);
  handleConfirmationUrlChange();
  handleCreateFolderUrlChange();
}
