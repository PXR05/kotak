import {
  EyeIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  Icon,
} from "@lucide/svelte";
import type { FileItem, FileAction } from "$lib/types/file.js";

interface FileActionConfig {
  id: FileAction;
  label: string;
  icon: typeof Icon;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

export const fileActions: FileActionConfig[] = [
  {
    id: "open",
    label: "Open",
    icon: EyeIcon,
  },
  {
    id: "download",
    label: "Download",
    icon: DownloadIcon,
  },
  {
    id: "rename",
    label: "Rename",
    icon: EditIcon,
  },
  {
    id: "delete",
    label: "Move to Trash",
    icon: TrashIcon,
    variant: "destructive",
    separator: true,
  },
];
