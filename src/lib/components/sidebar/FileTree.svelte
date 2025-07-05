<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import FileTreeItem from "./FileTreeItem.svelte";
  import { fileTree } from "$lib/stores/fileTree.svelte.js";
  import type { FileItem } from "$lib/types/file.js";

  let { rootItems }: { rootItems: FileItem[] } = $props();

  $effect(() => {
    fileTree.setRootItems(rootItems);
  });
</script>

<Sidebar.Group class="flex flex-col h-full">
  <Sidebar.GroupLabel>Files</Sidebar.GroupLabel>
  <Sidebar.GroupContent class="overflow-y-auto">
    <Sidebar.Menu>
      {#each fileTree.nodes as node (node.item.id)}
        <FileTreeItem {node} />
      {/each}
    </Sidebar.Menu>
  </Sidebar.GroupContent>
</Sidebar.Group>
