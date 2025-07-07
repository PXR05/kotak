import { page } from "$app/state";
import type { FileItem } from "$lib/types/file.js";
import { fileAPI } from "../file/fileAPI.js";

export interface ShareDialogState {
  open: boolean;
  item: FileItem | null;
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
  callback:
    | ((
        shareData: ShareData
      ) => Promise<{ shareId: string; publicUrl?: string }>)
    | null;
  loading: boolean;
  existingShareId: string | null;
  existingShareLink: string | null;
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
  existingShareLink: null,
});

function resetShareDialogState() {
  shareDialogData.isPublic = false;
  shareDialogData.emails = [];
  shareDialogData.expiresAt = null;
  shareDialogData.existingShareId = null;
  shareDialogData.existingShareLink = null;
}

export async function openShareDialog(
  item: FileItem,
  callback: (
    shareData: ShareData
  ) => Promise<{ shareId: string; publicUrl?: string }>
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
      shareDialogData.existingShareLink = `${page.url.origin}/shared/${
        item.type === "folder" ? "folders" : "files"
      }/${existingShare.shareId}`;
    } else {
      resetShareDialogState();
    }
  } catch (error) {
    console.error("Failed to load existing share data:", error);
    resetShareDialogState();
  }

  shareDialogData.loading = false;
}

export function closeShareDialog() {
  shareDialogData.open = false;
  shareDialogData.item = null;
  shareDialogData.callback = null;
  shareDialogData.loading = false;
  resetShareDialogState();
}
