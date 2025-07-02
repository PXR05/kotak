<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import {
    UploadIcon,
    FolderPlusIcon,
    CheckSquareIcon,
    RefreshCwIcon,
  } from "@lucide/svelte";
  import type { Table as TanStackTable } from "@tanstack/table-core";
  import type { FileItem } from "$lib/types/file.js";

  let {
    table,
    uploadDisabled = false,
    onContextMenuAction,
  }: {
    table: TanStackTable<FileItem>;
    uploadDisabled?: boolean;
    onContextMenuAction?: (action: string) => void;
  } = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <Table.Header {...props}>
        {#each table.getHeaderGroups() as headerGroup}
          <Table.Row>
            {#each headerGroup.headers as header, i}
              <Table.Head
                colspan={header.colSpan}
                class="{header.column.id === 'actions' ? 'w-15' : ''} {i === 0
                  ? 'pl-6'
                  : ''} py-2"
              >
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()}
                  />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#if !uploadDisabled && onContextMenuAction}
      <ContextMenu.Item onclick={() => onContextMenuAction("upload")}>
        <UploadIcon class="mr-2 size-4" />
        Upload Files
      </ContextMenu.Item>
      <ContextMenu.Item onclick={() => onContextMenuAction("upload-folder")}>
        <FolderPlusIcon class="mr-2 size-4" />
        Upload Folder
      </ContextMenu.Item>
      <ContextMenu.Item onclick={() => onContextMenuAction("create-folder")}>
        <FolderPlusIcon class="mr-2 size-4" />
        Create Folder
      </ContextMenu.Item>
      <ContextMenu.Separator />
    {/if}
    {#if table.getRowModel().rows?.length}
      {#if table.getIsAllPageRowsSelected()}
        <ContextMenu.Item onclick={() => onContextMenuAction?.("deselect-all")}>
          <CheckSquareIcon class="mr-2 size-4" />
          Deselect All
        </ContextMenu.Item>
      {:else}
        <ContextMenu.Item onclick={() => onContextMenuAction?.("select-all")}>
          <CheckSquareIcon class="mr-2 size-4" />
          Select All
        </ContextMenu.Item>
      {/if}
    {/if}
    <ContextMenu.Item onclick={() => onContextMenuAction?.("refresh")}>
      <RefreshCwIcon class="mr-2 size-4" />
      Refresh
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
