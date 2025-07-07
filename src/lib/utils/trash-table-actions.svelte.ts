import type { TrashTableActions } from "$lib/types/table";
import { Icon, RefreshCwIcon, Trash2Icon } from "@lucide/svelte";

interface TrashTableActionConfig {
  id: TrashTableActions;
  label: string;
  icon: typeof Icon;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

const actions: TrashTableActionConfig[] = $derived([
  {
    id: "refresh",
    label: "Refresh",
    icon: RefreshCwIcon,
  },
  {
    id: "empty-trash",
    label: "Empty Trash",
    icon: Trash2Icon,
    variant: "destructive",
    separator: true,
  },
]);

export const trashTableActions = () => actions;
