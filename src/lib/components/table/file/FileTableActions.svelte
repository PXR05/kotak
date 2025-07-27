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
  import { fileActions } from "$lib/utils/file-actions.svelte";

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
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="sm">
        <MoreHorizontalIcon class="size-4" />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    {#each fileActions as action, index}
      {#if action.separator && index > 0}
        <DropdownMenuSeparator />
      {/if}
      <DropdownMenuItem
        onclick={() => handleAction(action.id)}
        disabled={action.disabled}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </DropdownMenuItem>
    {/each}
  </DropdownMenuContent>
</DropdownMenu>
