export type FileItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  ownerId: string;
  updatedAt: Date;
  createdAt: Date;
  // File-specific properties
  size?: number;
  mimeType?: string;
  storageKey?: string;
  folderId?: string;
  // Folder-specific properties
  parentId?: string | null;
};

export type FileAction =
  | "open"
  | "download"
  | "rename"
  | "delete"
  | "share"
  | "copy"
  | "move";

export interface UploadableFile {
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
}
