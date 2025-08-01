import {
  EyeIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  Icon,
  Share2Icon,
  MoveIcon,
  InfoIcon,
} from "@lucide/svelte";
import type { FileAction } from "$lib/types/file.js";

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
    id: "info",
    label: "Info",
    icon: InfoIcon,
  },
  {
    id: "download",
    label: "Download",
    icon: DownloadIcon,
    separator: true,
  },
  {
    id: "share",
    label: "Share",
    icon: Share2Icon,
  },
  {
    id: "rename",
    label: "Rename",
    icon: EditIcon,
    separator: true,
  },
  {
    id: "move",
    label: "Move to Folder",
    icon: MoveIcon,
  },
  {
    id: "trash",
    label: "Move to Trash",
    icon: TrashIcon,
    variant: "destructive",
    separator: true,
  },
];