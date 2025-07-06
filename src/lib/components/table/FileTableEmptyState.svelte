<script lang="ts">
  import { UploadIcon } from "@lucide/svelte";
  import TableContextMenu from "./TableContextMenu.svelte";
</script>

<TableContextMenu>
  {#snippet children({ props })}
    <div
      {...props}
      class="m-auto text-center flex-1 w-full grid place-items-center"
    >
      <div class="flex flex-col items-center gap-2 text-muted-foreground">
        <UploadIcon class="size-8" />
        <p class="text-lg font-medium">No files yet</p>
        <p class="text-sm">
          Drag and drop files or folders here to upload, or use the upload
          button
        </p>
      </div>
    </div>
  {/snippet}
</TableContextMenu>
