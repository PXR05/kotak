export interface MoveItemResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  itemName: string;
}

export interface ShareItemOptions {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
}

export interface ShareResult {
  success: boolean;
  shareId: string;
  publicUrl?: string;
  message?: string;
}

export interface ExistingShareData {
  isPublic: boolean;
  emails: string[];
  expiresAt: Date | null;
  shareId: string;
}
