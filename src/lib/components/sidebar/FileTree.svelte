<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import FileTreeItem from "./FileTreeItem.svelte";
  import DragDropZone from "$lib/components/shared/DragDropZone.svelte";
  import { fileTree } from "$lib/stores";
  import type { FileItem } from "$lib/types/file.js";
  import { page } from "$app/state";
  import TableContextMenu from "../table/TableContextMenu.svelte";
  import AppIcon from "../shared/AppIcon.svelte";

  let { rootItems }: { rootItems: FileItem[] } = $props();

  $effect(() => {
    fileTree.setRootItems(rootItems);
  });
</script>

<DragDropZone class="flex flex-col flex-1 h-full relative">
  {#snippet children()}
    <Sidebar.Group class="flex flex-col h-full pb-0">
      <div class="flex-shrink-0">
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <TableContextMenu>
              {#snippet children({ props })}
                <Sidebar.MenuButton
                  {...props}
                  data-active={page.url.pathname === "/"}
                  class="font-medium"
                >
                  {#snippet child({ props })}
                    <a href="/files" {...props}>
                      <AppIcon strokeWidth={2.5} />
                      Kotak
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              {/snippet}
            </TableContextMenu>
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
    </Sidebar.Group>
  {/snippet}
</DragDropZone>
