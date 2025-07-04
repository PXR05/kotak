import type { TableActions } from "$lib/types/table";
import {
  Icon,
  UploadIcon,
  FolderPlusIcon,
  FolderPenIcon,
  RefreshCwIcon,
} from "@lucide/svelte";

interface TableActionConfig {
  id: TableActions;
  label: string;
  icon: typeof Icon;
  uploadDisabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

export const tableActions: TableActionConfig[] = [
  {
    id: "upload",
    label: "Upload File",
    icon: UploadIcon,
    uploadDisabled: true,
  },
  {
    id: "upload-folder",
    label: "Upload Folder",
    icon: FolderPlusIcon,
    uploadDisabled: true,
  },
  {
    id: "create-folder",
    label: "Create Folder",
    icon: FolderPenIcon,
    uploadDisabled: true,
  },
  {
    id: "refresh",
    label: "Refresh",
    icon: RefreshCwIcon,
    separator: true,
  },
];
