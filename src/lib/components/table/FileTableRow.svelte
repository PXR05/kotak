<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import type { Row, Table as TanStackTable } from "@tanstack/table-core";
  import type { FileItem } from "$lib/types/file.js";
  import { getAllActions } from "./file-actions.js";

  let {
    row,
    table,
    lastSelectedIndex,
    onRowDoubleClick,
    onContextMenuAction,
    onLastSelectedIndexChange,
  }: {
    row: Row<FileItem>;
    table: TanStackTable<FileItem>;
    lastSelectedIndex: number | null;
    onRowDoubleClick?: (item: FileItem) => void;
    onContextMenuAction?: (action: string, item: FileItem) => void;
    onLastSelectedIndexChange?: (index: number | null) => void;
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
      row.toggleSelected();
      onLastSelectedIndexChange?.(currentIndex);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);

      table.toggleAllPageRowsSelected(false);

      for (let i = start; i <= end; i++) {
        const targetRow = table.getRowModel().rows[i];
        if (targetRow) {
          targetRow.toggleSelected(true);
        }
      }
    } else {
      table.toggleAllPageRowsSelected(false);
      row.toggleSelected(true);
      onLastSelectedIndexChange?.(currentIndex);
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
    onRowDoubleClick?.(row.original);
  }

  const actions = getAllActions();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <Table.Row
        {...props}
        data-state={row.getIsSelected() && "selected"}
        class="hover:bg-muted/50 transition-colors cursor-pointer"
        onclick={handleRowClick}
        ondblclick={handleRowDoubleClick}
      >
        {#each row.getVisibleCells() as cell, i}
          <Table.Cell
            class="{cell.column.id !== 'name' ? 'text-muted-foreground' : ''} 
              {i === 0 ? 'pl-6' : ''}"
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
    {#each actions as action, index}
      {#if action.separator && index > 0}
        <ContextMenu.Separator />
      {/if}
      <ContextMenu.Item
        onclick={() => onContextMenuAction?.(action.id, row.original)}
        disabled={action.disabled?.(row.original)}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </ContextMenu.Item>
    {/each}
  </ContextMenu.Content>
</ContextMenu.Root>
