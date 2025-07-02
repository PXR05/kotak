<script lang="ts">
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import MoreHorizontalIcon from "@lucide/svelte/icons/more-horizontal";
  import type { FileItem, FileAction } from "$lib/types/file.js";

  let {
    item,
    onAction,
  }: {
    item: FileItem;
    onAction: (action: FileAction, item: FileItem) => void;
  } = $props();

  function handleAction(action: FileAction) {
    onAction(action, item);
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="sm" onclick={(e) => e.stopPropagation()}>
      <MoreHorizontalIcon class="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onclick={() => handleAction("open")}>
      Open
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => handleAction("download")}>
      Download
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => handleAction("rename")}>
      Rename
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onclick={() => handleAction("delete")}>
      Move to Trash
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
