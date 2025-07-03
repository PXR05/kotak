<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { DownloadIcon, TrashIcon, XIcon } from "@lucide/svelte";

  let {
    selectedCount,
    totalCount,
    isDownloading = false,
    onBulkDownload,
    onBulkDelete,
    onDeselectAll,
  }: {
    selectedCount: number;
    totalCount: number;
    isDownloading?: boolean;
    onBulkDownload?: () => void;
    onBulkDelete?: () => void;
    onDeselectAll?: () => void;
  } = $props();
</script>

<div
  class="flex items-center justify-between p-4 border-b bg-sidebar-primary/5"
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
      {selectedCount} of {totalCount} row(s) selected
    </span>
  </div>
  <div class="flex items-center gap-2">
    {#if onBulkDownload}
      <Button
        variant="outline"
        size="sm"
        onclick={onBulkDownload}
        disabled={isDownloading}
      >
        <DownloadIcon class="size-4 mr-2" />
        {isDownloading ? "Creating Zip..." : "Download Selected"}
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
