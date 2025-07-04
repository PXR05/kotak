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
  callback: (() => void) | null;
}

export const confirmationDialogData = $state<ConfirmationDialogState>({
  open: false,
  config: null,
  callback: null,
});

export function openConfirmationDialog(
  config: ConfirmationConfig,
  callback: () => void
) {
  confirmationDialogData.open = true;
  confirmationDialogData.config = config;
  confirmationDialogData.callback = callback;
}

export function closeConfirmationDialog() {
  confirmationDialogData.open = false;
  confirmationDialogData.config = null;
  confirmationDialogData.callback = null;
}
