<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { UndoIcon, XIcon, Trash2Icon } from "@lucide/svelte";
  import { quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import type { Table } from "@tanstack/table-core";
  import type { TrashedItem } from "$lib/types/file.js";

  let {
    table,
    onBulkRestore,
    onBulkDelete,
  }: {
    table: Table<TrashedItem>;
    onBulkRestore: (items: TrashedItem[]) => void;
    onBulkDelete: (items: TrashedItem[]) => void;
  } = $props();

  const selectedCount = $derived(
    table.getFilteredSelectedRowModel().rows.length
  );
  const totalCount = $derived(table.getFilteredRowModel().rows.length);

  function handleBulkRestore() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;
    onBulkRestore(selectedItems);
    table.toggleAllPageRowsSelected(false);
  }

  function handleBulkDelete() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;
    onBulkDelete(selectedItems);
    table.toggleAllPageRowsSelected(false);
  }

  function handleDeselectAll() {
    table.toggleAllPageRowsSelected(false);
  }

  function getSelectedItems(): TrashedItem[] {
    return table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  }
</script>

<div
  transition:fly={{ duration: 150, y: -10, easing: quintOut }}
  class="flex items-center justify-between p-4 rounded-md z-10 absolute top-0 left-0 right-0 bg-sidebar"
>
  <div class="flex items-center gap-2">
    <Button
      variant="ghost"
      size="sm"
      class="!p-0 aspect-square"
      onclick={handleDeselectAll}
      title="Deselect all"
    >
      <XIcon class="size-4" />
    </Button>

    <div class="w-px h-4 bg-border"></div>
    <span class="text-sm font-medium">
      {selectedCount} of {totalCount} item(s) selected
    </span>
  </div>
  <div class="flex items-center gap-2">
    <Button variant="outline" size="sm" onclick={handleBulkRestore}>
      <UndoIcon class="size-4 mr-2" />
      Restore selected
    </Button>
    <Button variant="destructive" size="sm" onclick={handleBulkDelete}>
      <Trash2Icon class="size-4 mr-2" />
      Delete selected
    </Button>
  </div>
</div>
