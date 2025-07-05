import { fileClipboard } from "$lib/stores";
import type { TableActions } from "$lib/types/table";
import {
  Icon,
  UploadIcon,
  FolderPlusIcon,
  FolderPenIcon,
  RefreshCwIcon,
  ClipboardPasteIcon,
} from "@lucide/svelte";

interface TableActionConfig {
  id: TableActions;
  label: string;
  icon: typeof Icon;
  uploadDisabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

const actions: TableActionConfig[] = $derived([
  {
    id: "paste",
    label: "Paste",
    icon: ClipboardPasteIcon,
    uploadDisabled: fileClipboard.data.length === 0,
  },
  {
    id: "upload",
    label: "Upload File",
    icon: UploadIcon,
    uploadDisabled: false,
    separator: true,
  },
  {
    id: "upload-folder",
    label: "Upload Folder",
    icon: FolderPlusIcon,
    uploadDisabled: false,
  },
  {
    id: "create-folder",
    label: "Create Folder",
    icon: FolderPenIcon,
    uploadDisabled: false,
  },
  {
    id: "refresh",
    label: "Refresh",
    icon: RefreshCwIcon,
    separator: true,
  },
]);

export const tableActions = () => actions;
