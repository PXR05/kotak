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
    separator: "w-0.5 h-6 bg-border rounded-full",
  } as const;
</script>

<div class="{styles.background} w-fit m-4 px-2">
  <div
    class="flex items-center gap-4 text-sm font-medium text-muted-foreground"
  >
    <span>Created: {file.createdAt.toLocaleString()}</span>
    <span class={styles.separator}></span>
    <span>Modified: {file.updatedAt.toLocaleString()}</span>
    {#if file.ownerId}
      <span class={styles.separator}></span>
      <span>Owner: {file.ownerId}</span>
    {/if}
  </div>
</div>
