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
  | "delete"
  | "cut"
  | "copy"
  | "paste";

export interface UploadableFile {
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
}
