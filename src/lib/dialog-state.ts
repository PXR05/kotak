import { type FileItem } from "./types/file.js";
import type { ConfirmationConfig } from "./components/table/ConfirmationDialog.svelte";

export interface DialogState<T = any> {
  open: boolean;
  data: T | null;
  callback: ((data: T) => Promise<void>) | null;
}

export function createDialogState<T = any>(): DialogState<T> {
  return {
    open: false,
    data: null,
    callback: null,
  };
}

export function openDialog<T>(
  state: DialogState<T>,
  data: T,
  callback: (data: T) => Promise<void>
): DialogState<T> {
  return {
    open: true,
    data,
    callback,
  };
}

export function closeDialog<T>(state: DialogState<T>): DialogState<T> {
  return {
    open: false,
    data: null,
    callback: null,
  };
}

export interface ConfirmationDialogState {
  open: boolean;
  config: ConfirmationConfig | null;
  callback: (() => void) | null;
}

export function createConfirmationDialogState(): ConfirmationDialogState {
  return {
    open: false,
    config: null,
    callback: null,
  };
}

export function openConfirmationDialog(
  state: ConfirmationDialogState,
  config: ConfirmationConfig,
  callback: () => void
): ConfirmationDialogState {
  return {
    open: true,
    config,
    callback,
  };
}

export function closeConfirmationDialog(
  state: ConfirmationDialogState
): ConfirmationDialogState {
  return {
    open: false,
    config: null,
    callback: null,
  };
}

export interface RenameDialogState {
  open: boolean;
  item: FileItem | null;
  callback: ((newName: string) => Promise<void>) | null;
}

export function createRenameDialogState(): RenameDialogState {
  return {
    open: false,
    item: null,
    callback: null,
  };
}

export function openRenameDialog(
  state: RenameDialogState,
  item: FileItem,
  callback: (newName: string) => Promise<void>
): RenameDialogState {
  return {
    open: true,
    item,
    callback,
  };
}

export function closeRenameDialog(state: RenameDialogState): RenameDialogState {
  return {
    open: false,
    item: null,
    callback: null,
  };
}

export interface CreateFolderDialogState {
  open: boolean;
  callback: ((name: string) => Promise<void>) | null;
}

export function createCreateFolderDialogState(): CreateFolderDialogState {
  return {
    open: false,
    callback: null,
  };
}

export function openCreateFolderDialog(
  state: CreateFolderDialogState,
  callback: (name: string) => Promise<void>
): CreateFolderDialogState {
  return {
    open: true,
    callback,
  };
}

export function closeCreateFolderDialog(
  state: CreateFolderDialogState
): CreateFolderDialogState {
  return {
    open: false,
    callback: null,
  };
}
