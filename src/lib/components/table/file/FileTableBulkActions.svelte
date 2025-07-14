<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { isDownloading, selectedItems, fileOperations } from "$lib/stores";
  import {
    DownloadIcon,
    TrashIcon,
    XIcon,
    MoveIcon,
    LoaderIcon,
  } from "@lucide/svelte";
  import { quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import type { Table } from "@tanstack/table-core";
  import type { FileItem } from "$lib/types/file.js";
  import { is } from "drizzle-orm";

  let {
    table,
  }: {
    table: Table<FileItem>;
  } = $props();

  const selectedCount = $derived(
    table.getFilteredSelectedRowModel().rows.length
  );
  const totalCount = $derived(table.getFilteredRowModel().rows.length);

  function handleDeselectAll() {
    table.toggleAllPageRowsSelected(false);
    selectedItems.length = 0;
  }

  const actions = $derived([
    {
      icon: DownloadIcon,
      label: "Download selected",
      action: () => fileOperations.bulkDownload(),
      loadingIcon: LoaderIcon,
      loadingText: "Creating Zip",
      isLoading: isDownloading.value,
    },
    {
      icon: MoveIcon,
      label: "Move selected",
      action: () => fileOperations.bulkMove(),
    },
    {
      icon: TrashIcon,
      label: "Delete selected",
      action: () => fileOperations.bulkTrash(),
      destructive: true,
    },
  ]);
</script>

<div
  transition:fly={{ duration: 150, y: -10, easing: quintOut }}
  class="flex items-center justify-between md:p-4 p-2 rounded-md z-10 absolute top-0 left-0 right-0 bg-sidebar"
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
    {#each actions as action}
      <Button
        variant={action.destructive ? "destructive" : "outline"}
        size="sm"
        onclick={action.action}
        disabled={action.isLoading}
      >
        {#if action.isLoading && action.loadingIcon}
          <action.loadingIcon class="size-4 mr-2 animate-spin" />
        {:else}
          <action.icon class="size-4 lg:mr-2" />
        {/if}
        <span class="max-lg:hidden">
          {action.isLoading && action.loadingText
            ? action.loadingText
            : action.label}
        </span>
      </Button>
    {/each}
  </div>
</div>
