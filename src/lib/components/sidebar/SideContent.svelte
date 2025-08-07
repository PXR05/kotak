<script lang="ts">
  import { page } from "$app/state";
  import { LoaderIcon } from "@lucide/svelte";
  import FileTree from "./FileTree.svelte";
  import { getRootItems } from "$lib/remote/load.remote";
  
  const rootItems = $derived(getRootItems());
</script>

{#await rootItems}
  <div class="p-4 text-sm text-muted-foreground">
    <LoaderIcon class="animate-spin size-4 text-primary m-auto" />
  </div>
{:then {data: items, error}}
  {#if error}
    <div class="p-4 text-sm">Failed to load root items: {error}</div>
  {:else}
    <FileTree rootItems={items!} />
  {/if}
{:catch}
  <div class="p-4 text-sm">Failed to load files</div>
{/await}
