import type { FileItem } from "$lib/types/file.js";
import { fileAPI } from "../file/fileAPI.js";

export interface ShareDialogState {
  open: boolean;
  item: FileItem | null;
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
  callback: ((shareData: ShareData) => Promise<void>) | null;
  loading: boolean;
  existingShareId: string | null;
}

export interface ShareData {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
}

export const shareDialogData = $state<ShareDialogState>({
  open: false,
  item: null,
  isPublic: false,
  emails: [],
  expiresAt: null,
  callback: null,
  loading: false,
  existingShareId: null,
});

export async function openShareDialog(
  item: FileItem,
  callback: (shareData: ShareData) => Promise<void>
) {
  shareDialogData.open = true;
  shareDialogData.item = item;
  shareDialogData.callback = callback;
  shareDialogData.loading = true;

  try {
    const existingShare = await fileAPI.getExistingShare(item);
    if (existingShare) {
      shareDialogData.isPublic = existingShare.isPublic;
      shareDialogData.emails = existingShare.emails;
      shareDialogData.expiresAt = existingShare.expiresAt;
      shareDialogData.existingShareId = existingShare.shareId;
    } else {
      shareDialogData.isPublic = false;
      shareDialogData.emails = [];
      shareDialogData.expiresAt = null;
      shareDialogData.existingShareId = null;
    }
  } catch (error) {
    console.error("Failed to load existing share data:", error);
    shareDialogData.isPublic = false;
    shareDialogData.emails = [];
    shareDialogData.expiresAt = null;
    shareDialogData.existingShareId = null;
  }

  shareDialogData.loading = false;
}

export function closeShareDialog() {
  shareDialogData.open = false;
  shareDialogData.item = null;
  shareDialogData.isPublic = false;
  shareDialogData.emails = [];
  shareDialogData.expiresAt = null;
  shareDialogData.callback = null;
  shareDialogData.loading = false;
  shareDialogData.existingShareId = null;
}
