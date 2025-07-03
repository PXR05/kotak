<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import { UploadIcon, FolderPlusIcon, RefreshCwIcon } from "@lucide/svelte";

  let {
    uploadDisabled = false,
    isEmpty = false,
    onContextMenuAction,
  }: {
    uploadDisabled?: boolean;
    isEmpty?: boolean;
    onContextMenuAction?: (action: string) => void;
  } = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div {...props} class="m-auto text-center flex-1 w-full">
        {#if isEmpty}
          {#if !uploadDisabled}
            <div class="flex flex-col items-center gap-2 text-muted-foreground">
              <UploadIcon class="size-8" />
              <p class="text-lg font-medium">No files yet</p>
              <p class="text-sm">
                Drag and drop files or folders here to upload, or use the upload
                button
              </p>
            </div>
          {:else}
            No results.
          {/if}
        {/if}
      </div>
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#if !uploadDisabled && onContextMenuAction}
      <ContextMenu.Item onclick={() => onContextMenuAction?.("upload")}>
        <UploadIcon class="mr-2 size-4" />
        Upload Files
      </ContextMenu.Item>
      <ContextMenu.Item onclick={() => onContextMenuAction?.("upload-folder")}>
        <FolderPlusIcon class="mr-2 size-4" />
        Upload Folder
      </ContextMenu.Item>
      <ContextMenu.Item onclick={() => onContextMenuAction?.("create-folder")}>
        <FolderPlusIcon class="mr-2 size-4" />
        Create Folder
      </ContextMenu.Item>
      <ContextMenu.Separator />
    {/if}
    <ContextMenu.Item onclick={() => onContextMenuAction?.("refresh")}>
      <RefreshCwIcon class="mr-2 size-4" />
      Refresh
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
