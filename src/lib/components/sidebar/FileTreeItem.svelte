<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FileIcon from "@lucide/svelte/icons/file";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import LoaderIcon from "@lucide/svelte/icons/loader";
  import { type FileTreeNode, fileTree, fileOperations } from "$lib/stores";
  import { fileActions } from "$lib/utils/file-actions.svelte";
  import FileTreeItem from "./FileTreeItem.svelte";
  import { page } from "$app/state";
  import { preloadData } from "$app/navigation";
  import FileContextMenu from "../table/FileContextMenu.svelte";

  let { node }: { node: FileTreeNode } = $props();

  const handleFileClick = () => {
    fileOperations.handleItemClick(node.item);
  };

  const handleFolderToggle = (e: MouseEvent) => {
    e.stopPropagation();
    fileTree.toggleFolder(node.item.id);
  };

  const handleFolderNameClick = (e: MouseEvent) => {
    e.stopPropagation();
    fileOperations.handleItemClick(node.item);
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
</script>

<FileContextMenu item={node.item}>
  {#snippet children({ props })}
    <div {...props}>
      {#if node.item.type === "file"}
        <Sidebar.MenuButton
          onclick={handleFileClick}
          class="w-full justify-start"
        >
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
                  class="w-full justify-start p-0 data-[active=false]:!bg-transparent"
                  onclick={() => {}}
                >
                  <div class="flex items-center w-full">
                    <button
                      onclick={handleFolderToggle}
                      class="flex items-center justify-center size-7 hover:bg-accent rounded duration-150 group/arrow"
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
                      class="flex items-center gap-2 flex-1 min-w-0 hover:bg-accent rounded px-2 py-1 duration-150 group/name"
                      type="button"
                    >
                      <FolderIcon class="size-4 flex-shrink-0" />
                      <span class="truncate text-left">
                        {node.item.name}
                      </span>
                    </button>
                  </div>
                </Sidebar.MenuButton>
              {/snippet}
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Sidebar.MenuSub>
                {#each node.children || [] as childNode (childNode.item.id)}
                  <FileTreeItem node={childNode} />
                {/each}
              </Sidebar.MenuSub>
            </Collapsible.Content>
          </Collapsible.Root>
        </Sidebar.MenuItem>
      {/if}
    </div>
  {/snippet}
</FileContextMenu>
