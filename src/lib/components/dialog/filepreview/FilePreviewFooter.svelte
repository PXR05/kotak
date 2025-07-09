<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import type { FileItem } from "$lib/types/file.js";
  import { formatFileSize } from "$lib/utils/format";
  import { InfoIcon } from "@lucide/svelte";

  let {
    file,
  }: {
    file: FileItem;
  } = $props();

  const styles = {
    background:
      "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2",
    separator:
      "w-px dark:w-0.5 h-6 dark:bg-border bg-muted-foreground rounded-full",
  } as const;
</script>

<div class="flex items-end gap-2 w-full p-2">
  <Button
    variant="ghost"
    size="icon"
    class="{styles.background} size-11"
    onclick={() => {}}
  >
    <InfoIcon class="size-4" />
  </Button>
  <div class="{styles.background} w-fit h-11 px-4">
    <div
      class="flex items-center gap-4 text-sm font-medium text-muted-foreground"
    >
      <span>{formatFileSize(file.size ?? 0)}</span>
      <span class={styles.separator}></span>
      <span
        >{file.mimeType?.split("/")[1] ||
          file.mimeType?.split("/")[0] ||
          "file"}</span
      >
      <span class={styles.separator}></span>
      <span>{file.updatedAt?.toLocaleString()}</span>
    </div>
  </div>
</div>
