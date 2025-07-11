import { createUrlStateManager } from "./urlStateHelper.js";

export interface ConfirmationConfig {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  icon?: boolean;
}

export interface ConfirmationDialogState {
  open: boolean;
  config: ConfirmationConfig | null;
  callback: (() => void | Promise<void>) | null;
}

const urlStateManager = createUrlStateManager({
  paramName: "confirm",
  stateName: "confirmationDialog",
});

export const confirmationDialogData = $state<ConfirmationDialogState>({
  open: false,
  config: null,
  callback: null,
});

export function openConfirmationDialog(
  config: ConfirmationConfig,
  callback: () => void | Promise<void>
) {
  confirmationDialogData.open = true;
  confirmationDialogData.config = config;
  confirmationDialogData.callback = callback;
  urlStateManager.pushUrlState("confirmation", { title: config.title });
}

export function closeConfirmationDialog() {
  confirmationDialogData.open = false;
  confirmationDialogData.config = null;
  confirmationDialogData.callback = null;
  urlStateManager.clearUrlState();
}

export function initConfirmationFromUrl() {
  const confirmationId = urlStateManager.getFileIdFromUrl();
  if (confirmationId) {
    confirmationDialogData.open = false;
  }
}

export function handleConfirmationUrlChange() {
  const confirmationId = urlStateManager.getFileIdFromUrl();

  if (!confirmationId && confirmationDialogData.open) {
    confirmationDialogData.open = false;
    confirmationDialogData.config = null;
    confirmationDialogData.callback = null;
  }
}
