<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import type { Row, Table as TanStackTable } from "@tanstack/table-core";
  import type { FileItem } from "$lib/types/file.js";
  import {
    fileOperations,
    lastSelectedIndex,
    selectedItems,
  } from "$lib/stores";
  import { fileActions } from "$lib/utils/file-actions.svelte";
  import { preloadData } from "$app/navigation";

  let {
    row,
    table,
  }: {
    row: Row<FileItem>;
    table: TanStackTable<FileItem>;
  } = $props();

  function handleRowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-slot="button"]') ||
      target.closest('[data-slot="dropdown-menu-trigger"]') ||
      target.closest("button")
    ) {
      return;
    }

    const currentIndex = row.index;

    if (e.ctrlKey || e.metaKey) {
      row.toggleSelected(true);
      selectedItems.push(row.original);
      lastSelectedIndex.value = currentIndex;
    } else if (e.shiftKey && lastSelectedIndex.value !== null) {
      const start = Math.min(lastSelectedIndex.value, currentIndex);
      const end = Math.max(lastSelectedIndex.value, currentIndex);

      selectedItems.length = 0;
      table.toggleAllPageRowsSelected(false);

      for (let i = start; i <= end; i++) {
        const targetRow = table.getRowModel().rows[i];
        if (targetRow) {
          selectedItems.push(targetRow.original);
          targetRow.toggleSelected(true);
        }
      }
    } else {
      selectedItems.length = 0;
      selectedItems.push(row.original);
      table.toggleAllPageRowsSelected(false);
      row.toggleSelected(true);
      lastSelectedIndex.value = currentIndex;
    }

    const item = row.original;
    if (item.type === "folder") {
      preloadData(`/${item.id}`);
    }
  }

  function handleRowDoubleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-slot="button"]') ||
      target.closest('[data-slot="dropdown-menu-trigger"]') ||
      target.closest("button")
    ) {
      return;
    }
    fileOperations.handleItemClick?.(row.original);
  }

  let preloadTimeout: ReturnType<typeof setTimeout> | null = $state(null);
  function handleRowPreload() {
    const item = row.original;
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

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <Table.Row
        {...props}
        data-state={row.getIsSelected() && "selected"}
        class="hover:bg-muted/50 transition-none cursor-pointer"
        onclick={handleRowClick}
        ondblclick={handleRowDoubleClick}
        onmouseenter={handleRowPreload}
        onmouseleave={() => {
          if (preloadTimeout) {
            clearTimeout(preloadTimeout);
            preloadTimeout = null;
          }
        }}
      >
        {#each row.getVisibleCells() as cell, i}
          <Table.Cell
            class="{cell.column.id !== 'name' ? 'text-muted-foreground' : ''} 
              {i === 0 ? 'pl-5' : ''}"
          >
            <FlexRender
              content={cell.column.columnDef.cell}
              context={cell.getContext()}
            />
          </Table.Cell>
        {/each}
      </Table.Row>
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#each fileActions() as action, index}
      {#if action.separator && index > 0}
        <ContextMenu.Separator />
      {/if}
      <ContextMenu.Item
        onclick={() =>
          fileOperations.handleContextMenuAction(action.id, row.original)}
        disabled={action.disabled}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </ContextMenu.Item>
    {/each}
  </ContextMenu.Content>
</ContextMenu.Root>
