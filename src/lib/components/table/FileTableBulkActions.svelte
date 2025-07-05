<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { isDownloading } from "$lib/stores";
  import { DownloadIcon, TrashIcon, XIcon } from "@lucide/svelte";
  import { quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  let {
    selectedCount,
    totalCount,
    onBulkDownload,
    onBulkDelete,
    onDeselectAll,
  }: {
    selectedCount: number;
    totalCount: number;
    onBulkDownload?: () => void;
    onBulkDelete?: () => void;
    onDeselectAll?: () => void;
  } = $props();
</script>

<div
  transition:fly={{ duration: 100, y: -10, easing: quintOut }}
  class="flex items-center justify-between px-4 py-1.5 rounded-t-lg z-10 absolute top-0 left-0 right-0 bg-background"
>
  <div class="flex items-center gap-2">
    <Button
      variant="ghost"
      size="sm"
      onclick={onDeselectAll}
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
    {#if onBulkDownload}
      <Button
        variant="outline"
        size="sm"
        onclick={onBulkDownload}
        disabled={isDownloading.value}
      >
        <DownloadIcon class="size-4 mr-2" />
        {isDownloading.value ? "Creating Zip..." : "Download Selected"}
      </Button>
    {/if}
    {#if onBulkDelete}
      <Button variant="outline" size="sm" onclick={onBulkDelete}>
        <TrashIcon class="size-4 mr-2" />
        Delete Selected
      </Button>
    {/if}
  </div>
</div>
