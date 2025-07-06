<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { isDownloading, selectedItems, fileOperations } from "$lib/stores";
  import { DownloadIcon, TrashIcon, XIcon } from "@lucide/svelte";
  import { quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import type { Table } from "@tanstack/table-core";
  import type { FileItem } from "$lib/types/file.js";

  let {
    table,
  }: {
    table: Table<FileItem>;
  } = $props();

  const selectedCount = $derived(
    table.getFilteredSelectedRowModel().rows.length
  );
  const totalCount = $derived(table.getFilteredRowModel().rows.length);

  function handleBulkDownload() {
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);

    if (selected.length === 0) return;

    selectedItems.splice(0, selectedItems.length, ...selected);
    fileOperations.bulkDownload();
  }

  function handleBulkDelete() {
    fileOperations.bulkDelete();
    table.toggleAllPageRowsSelected(false);
  }

  function handleDeselectAll() {
    table.toggleAllPageRowsSelected(false);
  }
</script>

<div
  transition:fly={{ duration: 100, y: -10, easing: quintOut }}
  class="flex items-center justify-between px-4 py-2 rounded-t-lg z-10 absolute top-0 left-0 right-0 bg-background"
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
    <Button
      variant="outline"
      size="sm"
      onclick={handleBulkDownload}
      disabled={isDownloading.value}
    >
      <DownloadIcon class="size-4 mr-2" />
      {isDownloading.value ? "Creating Zip..." : "Download Selected"}
    </Button>
    <Button variant="outline" size="sm" onclick={handleBulkDelete}>
      <TrashIcon class="size-4 mr-2" />
      Delete Selected
    </Button>
  </div>
</div>
