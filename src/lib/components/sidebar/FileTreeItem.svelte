<script lang="ts">
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FileIcon from "@lucide/svelte/icons/file";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import LoaderIcon from "@lucide/svelte/icons/loader";
  import { type FileTreeNode, fileTree, fileOperations } from "$lib/stores";
  import FileTreeItem from "./FileTreeItem.svelte";
  import { page } from "$app/state";
  import { preloadData } from "$app/navigation";
  import FileContextMenu from "../table/file/FileContextMenu.svelte";
  import {
    createDragState,
    handleDragStart as dragUtilStart,
    handleDragEnd as dragUtilEnd,
    handleDropZoneDragEnter as dropEnter,
    handleDropZoneDragOver as dropOver,
    handleDropZoneDragLeave as dropLeave,
    handleDropZoneDrop as dropHandler,
    createGlobalDragHandlers,
  } from "$lib/stores/ui/drag-drop.svelte.js";

  const { i, nodeList }: { i: number; nodeList: FileTreeNode[] } = $props();

  const node = $derived(nodeList[i]);

  const sidebar = Sidebar.useSidebar();

  const handleFileClick = () => {
    fileOperations.handleItemClick(
      node.item,
      nodeList.map((n) => n.item),
      i
    );
    sidebar.setOpenMobile(false);
  };

  const handleFolderToggle = (e: MouseEvent) => {
    e.stopPropagation();
    fileTree.toggleFolder(node.item.id);
  };

  const handleFolderNameClick = (e: MouseEvent) => {
    e.stopPropagation();
    fileOperations.handleItemClick(node.item);
    sidebar.setOpenMobile(false);
  };

  let preloadTimeout: ReturnType<typeof setTimeout> | null = $state(null);
  function handleFolderPreload() {
    const item = node.item;
    if (item.type === "folder") {
      if (preloadTimeout) {
        clearTimeout(preloadTimeout);
      }
      preloadTimeout = setTimeout(() => {
        preloadData(`/${item.id}`);
      }, 100);
    }
  }

  const dragState = createDragState();
  const { handleGlobalDragEnd, handleGlobalDragLeave } =
    createGlobalDragHandlers(dragState);

  function handleDragStart(e: DragEvent) {
    dragUtilStart(dragState, node.item, e);
  }

  function handleDragEnd() {
    dragUtilEnd(dragState);
  }

  function handleDropZoneDragEnter(e: DragEvent) {
    if (node.item.type !== "folder") return;
    dropEnter(dragState, node.item.id, e);
  }

  function handleDropZoneDragOver(e: DragEvent) {
    if (node.item.type !== "folder") return;
    dropOver(node.item.id, e);
  }

  function handleDropZoneDragLeave(e: DragEvent) {
    if (node.item.type !== "folder") return;
    dropLeave(dragState, node.item.id, e);
  }

  async function handleDropZoneDrop(e: DragEvent) {
    if (node.item.type !== "folder") return;
    await dropHandler(dragState, node.item.id, e);
  }
</script>

<svelte:window
  ondragend={handleGlobalDragEnd}
  ondragleave={handleGlobalDragLeave}
/>

<FileContextMenu item={node.item}>
  {#snippet children({ props })}
    <div {...props}>
      {#if node.item.type === "file"}
        <Sidebar.MenuButton
          onclick={handleFileClick}
          class="relative overflow-visible w-full justify-start {dragState.isDragging
            ? 'opacity-50'
            : ''}"
          draggable="true"
          ondragstart={handleDragStart}
          ondragend={handleDragEnd}
        >
          <span class="h-4 w-2 absolute -left-[10px] top-0 border-b"></span>
          <FileIcon class="size-4" />
          <span class="truncate">
            {node.item.name}
          </span>
        </Sidebar.MenuButton>
      {:else}
        <Sidebar.MenuItem>
          <Collapsible.Root class="group/collapsible" open={node.expanded}>
            <Collapsible.Trigger>
              {#snippet child({ props })}
                <Sidebar.MenuButton
                  {...props}
                  data-active={page.url.pathname === `/${node.item.id}`}
                  class="group w-full items-center justify-center p-0 gap-0 data-[active=false]:!bg-transparent"
                  onclick={() => {}}
                >
                  <span
                    class="h-4 w-2 group-data-[active=false]:w-3 absolute -left-[10px] top-0 border-b"
                  ></span>

                  <button
                    onclick={handleFolderToggle}
                    class="flex items-center justify-center h-8 w-4 ml-1.25 hover:bg-accent rounded-md duration-150 group/arrow"
                    type="button"
                  >
                    {#if node.loading}
                      <LoaderIcon class="size-3 animate-spin" />
                    {:else}
                      <ChevronRightIcon
                        class="size-3 transition-transform duration-200 {node.expanded
                          ? 'rotate-90'
                          : 'rotate-0'}"
                      />
                    {/if}
                  </button>

                  <button
                    onclick={handleFolderNameClick}
                    onmouseenter={handleFolderPreload}
                    onmouseleave={() => {
                      if (preloadTimeout) {
                        clearTimeout(preloadTimeout);
                        preloadTimeout = null;
                      }
                    }}
                    class="flex items-center gap-2 flex-1 min-w-0 hover:bg-accent rounded-md px-2 h-8 duration-150 group/name border border-transparent
                    {dragState.isDragging ? 'opacity-50' : ''} 
                      {dragState.isDropTarget
                      ? 'transition-none bg-sidebar-primary/10 !border-sidebar-primary'
                      : ''}"
                    type="button"
                    draggable="true"
                    ondragstart={handleDragStart}
                    ondragend={handleDragEnd}
                    ondragenter={handleDropZoneDragEnter}
                    ondragover={handleDropZoneDragOver}
                    ondragleave={handleDropZoneDragLeave}
                    ondrop={handleDropZoneDrop}
                  >
                    <FolderIcon class="size-4 flex-shrink-0" />
                    <span class="truncate text-left">
                      {node.item.name}
                    </span>
                  </button>
                </Sidebar.MenuButton>
              {/snippet}
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Sidebar.MenuSub>
                {#each node.children || [] as childNode, j (childNode.item.id)}
                  <FileTreeItem i={j} nodeList={node.children ?? []} />
                {/each}
              </Sidebar.MenuSub>
            </Collapsible.Content>
          </Collapsible.Root>
        </Sidebar.MenuItem>
      {/if}
    </div>
  {/snippet}
</FileContextMenu>
