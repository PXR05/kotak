<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import { EyeIcon, DownloadIcon, TrashIcon } from "@lucide/svelte";
  import type { Row, Table as TanStackTable } from "@tanstack/table-core";
  import type { FileItem } from "$lib/types/file.js";

  let {
    row,
    table,
    lastSelectedIndex,
    onRowClick,
    onRowDoubleClick,
    onContextMenuAction,
    onLastSelectedIndexChange,
  }: {
    row: Row<FileItem>;
    table: TanStackTable<FileItem>;
    lastSelectedIndex: number | null;
    onRowClick?: (item: FileItem) => void;
    onRowDoubleClick?: (item: FileItem) => void;
    onContextMenuAction?: (action: string, item: FileItem) => void;
    onLastSelectedIndexChange?: (index: number | null) => void;
  } = $props();

  function handleRowClick(e: MouseEvent) {
    // Prevent row click when clicking on action buttons
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
      // Ctrl+click: Toggle selection of this item
      row.toggleSelected();
      onLastSelectedIndexChange?.(currentIndex);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: Select range from last selected to current
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);

      // Clear all selections first
      table.toggleAllPageRowsSelected(false);

      // Select the range
      for (let i = start; i <= end; i++) {
        const targetRow = table.getRowModel().rows[i];
        if (targetRow) {
          targetRow.toggleSelected(true);
        }
      }
    } else {
      // Regular click: Select only this item
      table.toggleAllPageRowsSelected(false);
      row.toggleSelected(true);
      onLastSelectedIndexChange?.(currentIndex);
    }
  }

  function handleRowDoubleClick(e: MouseEvent) {
    // Prevent double-click when clicking on action buttons
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-slot="button"]') ||
      target.closest('[data-slot="dropdown-menu-trigger"]') ||
      target.closest("button")
    ) {
      return;
    }
    // Double click opens the file/folder
    onRowDoubleClick?.(row.original);
  }
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
            class="{cell.column.id === 'actions'
              ? 'w-15'
              : cell.column.id === 'type' ||
                  cell.column.id === 'size' ||
                  cell.column.id === 'updatedAt' ||
                  cell.column.id === 'ownerId'
                ? 'text-muted-foreground'
                : ''} {i === 0 ? 'pl-6' : ''}"
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
    <ContextMenu.Item
      onclick={() => onContextMenuAction?.("view", row.original)}
    >
      <EyeIcon class="mr-2 size-4" />
      {row.original.type === "folder" ? "Open Folder" : "View File"}
    </ContextMenu.Item>
    <ContextMenu.Item
      onclick={() => onContextMenuAction?.("download", row.original)}
      disabled={row.original.type === "folder"}
    >
      <DownloadIcon class="mr-2 size-4" />
      Download
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item
      variant="destructive"
      onclick={() => onContextMenuAction?.("delete", row.original)}
    >
      <TrashIcon class="mr-2 size-4" />
      Delete
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
