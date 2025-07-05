<script lang="ts">
  import { page } from "$app/state";
  import { LoaderIcon } from "@lucide/svelte";
  import FileTree from "./FileTree.svelte";
  import type { LayoutData } from "../../../routes/$types";

  const { rootItems } = $derived(page.data as LayoutData);
</script>

{#await rootItems}
  <div class="p-4 text-sm text-muted-foreground">
    <LoaderIcon class="animate-spin size-4 text-primary m-auto" />
  </div>
{:then items}
  <FileTree rootItems={items} />
{:catch}
  <div class="p-4 text-sm">Failed to load files</div>
{/await}
