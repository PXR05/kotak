export type FileItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  ownerId: string;
  updatedAt: Date;
  createdAt: Date;
  // File
  size?: number;
  mimeType?: string;
  storageKey?: string;
  folderId?: string;
  isEncrypted?: boolean;
  // Folder
  parentId?: string | null;
};

export type FileAction =
  | "open"
  | "info"
  | "download"
  | "rename"
  | "move"
  | "share"
  | "trash";

export interface UploadableFile {
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
}

export interface TrashedItem {
  id: string;
  itemId: string;
  type: "file" | "folder";
  originalFolderId?: string | null;
  originalParentId?: string | null;
  trashedAt: Date;
  name: string;
  encryptedDek?: string | null;
  isEncrypted?: boolean;
}
