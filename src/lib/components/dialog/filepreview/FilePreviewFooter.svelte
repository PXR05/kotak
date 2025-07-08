<script lang="ts">
  import type { FileItem } from "$lib/types/file.js";

  let {
    file,
  }: {
    file: FileItem;
  } = $props();

  const styles = {
    background:
      "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2",
  } as const;
</script>

<div class="{styles.background} w-fit m-4 px-2">
  <div
    class="flex items-center gap-4 text-sm font-medium text-muted-foreground"
  >
    <span>Created: {file.createdAt.toLocaleString()}</span>
    |
    <span>Modified: {file.updatedAt.toLocaleString()}</span>
    {#if file.ownerId}
      |
      <span>Owner: {file.ownerId}</span>
    {/if}
  </div>
</div>
