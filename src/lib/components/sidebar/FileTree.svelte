<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import FileTreeItem from "./FileTreeItem.svelte";
  import { fileTree } from "$lib/stores/fileTree.svelte.js";
  import type { FileItem } from "$lib/types/file.js";
  import { HardDriveIcon } from "@lucide/svelte";
  import { page } from "$app/state";

  let { rootItems }: { rootItems: FileItem[] } = $props();

  $effect(() => {
    fileTree.setRootItems(rootItems);
  });
</script>

<Sidebar.Group class="flex flex-col h-full">
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0">
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton
            data-active={page.url.pathname === "/"}
            class="font-medium"
          >
            {#snippet child({ props })}
              <a href="/files" {...props}>
                <HardDriveIcon class="size-4" />
                Drive
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </div>

    <div class="flex-1 overflow-hidden">
      <Sidebar.Menu class="h-full">
        <div class="h-full overflow-y-auto">
          <Sidebar.MenuSub>
            {#each fileTree.nodes as node (node.item.id)}
              <FileTreeItem {node} />
            {/each}
          </Sidebar.MenuSub>
        </div>
      </Sidebar.Menu>
    </div>
  </div>
</Sidebar.Group>
