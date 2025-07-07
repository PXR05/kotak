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
  // Folder
  parentId?: string | null;
};

export type FileAction =
  | "open"
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
  itemType: "file" | "folder";
  originalFolderId?: string | null;
  originalParentId?: string | null;
  trashedAt: Date;
  name: string;
}
