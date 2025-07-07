import {
  EyeIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  Icon,
  Share2Icon,
  MoveIcon,
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

const actions: FileActionConfig[] = $derived([
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
]);

export const fileActions = () => actions;
