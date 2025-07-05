import {
  EyeIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  Icon,
  ScissorsIcon,
  CopyIcon,
  ClipboardPasteIcon,
} from "@lucide/svelte";
import type { FileAction } from "$lib/types/file.js";
import { fileClipboard } from "$lib/stores";

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
    id: "rename",
    label: "Rename",
    icon: EditIcon,
  },
  {
    id: "cut",
    label: "Cut",
    icon: ScissorsIcon,
    separator: true,
  },
  {
    id: "copy",
    label: "Copy",
    icon: CopyIcon,
  },
  {
    id: "paste",
    label: "Paste",
    icon: ClipboardPasteIcon,
    disabled: fileClipboard.data.length === 0,
  },
  {
    id: "delete",
    label: "Move to Trash",
    icon: TrashIcon,
    variant: "destructive",
    separator: true,
  },
]);

export const fileActions = () => actions;
