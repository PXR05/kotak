<script lang="ts">
  import { UploadIcon } from "@lucide/svelte";

  let {
    isDragOver,
    uploadDisabled = false,
    onFilesUpload,
  }: {
    isDragOver: boolean;
    uploadDisabled?: boolean;
    onFilesUpload?: (files: any[]) => void;
  } = $props();
</script>

{#if isDragOver && !uploadDisabled && onFilesUpload}
  <div
    class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
  >
    <div class="flex flex-col items-center gap-2 text-primary">
      <UploadIcon class="size-8" />
      <p class="text-lg font-medium">Drop files here to upload</p>
      <p class="text-sm text-muted-foreground">Release to upload files</p>
    </div>
  </div>
{/if}
