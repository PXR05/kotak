<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import FileTree from "./FileTree.svelte";
  import { getRootItems } from "$lib/remote/load.remote";
  import type { FileItem } from "$lib/types/file";

  let isLoading = $state(true);
  let isInitialLoad = $state(true);
  let rootItems: FileItem[] = $state([]);
  let error: string | null = $state(null);

  $effect(() => {
    getRootItems().then(({ data, error }) => {
      if (error) {
        error = error;
      } else {
        rootItems = data ?? [];
      }
      isLoading = false;
      isInitialLoad = false;
    });
  });
</script>

{#if isInitialLoad}
  <div class="p-4 text-sm text-muted-foreground">
    <LoaderIcon class="animate-spin size-4 text-primary m-auto" />
  </div>
{:else if error}
  <div class="p-4 text-sm text-muted-foreground">
    Failed to load files: {error}
  </div>
{:else}
  <div class={isLoading ? "opacity-50 pointer-events-none" : ""}>
    <FileTree {rootItems} />
  </div>
{/if}
