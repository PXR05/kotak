<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import FileTreeItem from "./FileTreeItem.svelte";
  import DragDropZone from "$lib/components/shared/DragDropZone.svelte";
  import { fileTree, fileOperations, selectedItems } from "$lib/stores";
  import type { FileItem } from "$lib/types/file.js";
  import { page } from "$app/state";
  import TableContextMenu from "../table/TableContextMenu.svelte";
  import AppIcon from "../shared/AppIcon.svelte";
  import {
    createDragState,
    handleDropZoneDragEnter as dropEnter,
    handleDropZoneDragOver as dropOver,
    handleDropZoneDragLeave as dropLeave,
    handleDropZoneDrop as dropHandler,
    createGlobalDragHandlers,
  } from "$lib/stores/ui/drag-drop.svelte.js";

  let { rootItems }: { rootItems: FileItem[] } = $props();

  const sidebar = Sidebar.useSidebar();

  $effect(() => {
    fileTree.setRootItems(rootItems);
  });

  const dragState = createDragState();
  const { handleGlobalDragEnd, handleGlobalDragLeave } =
    createGlobalDragHandlers(dragState);

  function handleDropZoneDragEnter(e: DragEvent) {
    dropEnter(dragState, "ROOT", e);
  }

  function handleDropZoneDragOver(e: DragEvent) {
    dropOver("ROOT", e);
  }

  function handleDropZoneDragLeave(e: DragEvent) {
    dropLeave(dragState, "ROOT", e);
  }

  async function handleDropZoneDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragState.reset();

    try {
      const dragData = e.dataTransfer?.getData("text/plain");
      if (!dragData) return;

      const parsedData = JSON.parse(dragData);
      if (parsedData.type !== "file-move") return;

      const draggedItems = parsedData.items;

      const itemsToMove = selectedItems.filter((item) =>
        draggedItems.some((draggedItem: any) => draggedItem.id === item.id)
      );

      if (itemsToMove.length > 0) {
        await fileOperations.moveItems(itemsToMove, null);
        selectedItems.length = 0;
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  }
</script>

<svelte:window
  ondragend={handleGlobalDragEnd}
  ondragleave={handleGlobalDragLeave}
/>

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
                  class="font-medium border border-transparent {dragState.isDropTarget
                    ? 'transition-none !bg-sidebar-primary/10 border-sidebar-primary'
                    : ''}"
                  ondragenter={handleDropZoneDragEnter}
                  ondragover={handleDropZoneDragOver}
                  ondragleave={handleDropZoneDragLeave}
                  ondrop={handleDropZoneDrop}
                  onclick={() => {
                    sidebar.setOpenMobile(false);
                  }}
                >
                  {#snippet child({ props })}
                    <a href="/" {...props}>
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
