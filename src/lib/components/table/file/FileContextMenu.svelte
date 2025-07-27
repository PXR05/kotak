<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import {
    fileOperations,
    lastSelectedIndex,
    selectedItems,
  } from "$lib/stores";
  import { fileActions } from "$lib/utils/file-actions.svelte";
  import type { Snippet } from "svelte";
  import { CheckCircle2Icon } from "@lucide/svelte";
  import type { Row } from "@tanstack/table-core";

  let {
    item,
    rowItem,
    children,
  }: {
    item?: FileItem;
    rowItem?: Row<FileItem>;
    children: Snippet<[{ props: Record<string, any>; open: boolean }]>;
  } = $props();

  let open = $state(false);
</script>

<ContextMenu.Root bind:open>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      {@render children?.({ props, open })}
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#if item && rowItem}
      <ContextMenu.Item
        onclick={() => {
          const currentIndex = rowItem.index;
          rowItem.toggleSelected(true);
          selectedItems.push(item);
          lastSelectedIndex.value = currentIndex;
        }}
      >
        <CheckCircle2Icon class="mr-2 size-4" />
        Select
      </ContextMenu.Item>
      <ContextMenu.Separator />
    {/if}
    {#each fileActions as action, index}
      {#if action.separator && index > 0}
        <ContextMenu.Separator />
      {/if}
      <ContextMenu.Item
        onclick={() => fileOperations.handleContextMenuAction(action.id, item)}
        disabled={action.disabled}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </ContextMenu.Item>
    {/each}
  </ContextMenu.Content>
</ContextMenu.Root>
