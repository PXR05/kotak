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
  disabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

const actions: TableActionConfig[] = $derived([
  {
    id: "upload",
    label: "Upload File",
    icon: UploadIcon,
  },
  {
    id: "upload-folder",
    label: "Upload Folder",
    icon: FolderPlusIcon,
  },
  {
    id: "create-folder",
    label: "Create Folder",
    icon: FolderPenIcon,
  },
  {
    id: "refresh",
    label: "Refresh",
    icon: RefreshCwIcon,
    separator: true,
  },
]);

export const tableActions = () => actions;
