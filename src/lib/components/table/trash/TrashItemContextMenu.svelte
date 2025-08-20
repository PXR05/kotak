<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import type { TrashedItem } from "$lib/types/file.js";
  import { lastSelectedIndex, selectedItems } from "$lib/stores";
  import type { Snippet } from "svelte";
  import { CheckCircle2Icon, UndoIcon, Trash2Icon } from "@lucide/svelte";
  import type { Row } from "@tanstack/table-core";

  let {
    item,
    rowItem,
    children,
    onRestore,
    onPermanentDelete,
  }: {
    item?: TrashedItem;
    rowItem?: Row<TrashedItem>;
    children: Snippet<[{ props: Record<string, any>; open: boolean }]>;
    onRestore: (item: TrashedItem) => void;
    onPermanentDelete: (item: TrashedItem) => void;
  } = $props();

  let open = $state(false);
</script>

<ContextMenu.Root bind:open>
  <ContextMenu.Trigger class="group/ctx-trigger">
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
          selectedItems.push({
            id: item.itemId,
            name: item.name,
            type: item.type,
            ownerId: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            folderId: item.originalFolderId || undefined,
            parentId: item.originalParentId || undefined,
          });
          lastSelectedIndex.value = currentIndex;
        }}
      >
        <CheckCircle2Icon class="mr-2 size-4" />
        Select
      </ContextMenu.Item>
      <ContextMenu.Item onclick={() => onRestore(item)}>
        <UndoIcon class="mr-2 size-4" />
        Restore
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item
        variant="destructive"
        onclick={() => onPermanentDelete(item)}
      >
        <Trash2Icon class="mr-2 size-4" />
        Permanently Delete
      </ContextMenu.Item>
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>
