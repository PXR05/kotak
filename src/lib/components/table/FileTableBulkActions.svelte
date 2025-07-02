<script lang="ts">
  import * as Button from "$lib/components/ui/button/index.js";
  import { DownloadIcon, TrashIcon } from "@lucide/svelte";

  let {
    selectedCount,
    totalCount,
    isDownloading = false,
    onBulkDownload,
    onBulkDelete,
  }: {
    selectedCount: number;
    totalCount: number;
    isDownloading?: boolean;
    onBulkDownload?: () => void;
    onBulkDelete?: () => void;
  } = $props();
</script>

<div class="flex items-center justify-between p-4 border-b bg-sidebar-primary/5">
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium">
      {selectedCount} of {totalCount} row(s) selected
    </span>
  </div>
  <div class="flex items-center gap-2">
    {#if onBulkDownload}
      <Button.Root
        variant="outline"
        size="sm"
        onclick={onBulkDownload}
        disabled={isDownloading}
      >
        <DownloadIcon class="size-4 mr-2" />
        {isDownloading ? "Creating Zip..." : "Download Selected"}
      </Button.Root>
    {/if}
    {#if onBulkDelete}
      <Button.Root variant="outline" size="sm" onclick={onBulkDelete}>
        <TrashIcon class="size-4 mr-2" />
        Delete Selected
      </Button.Root>
    {/if}
  </div>
</div>
