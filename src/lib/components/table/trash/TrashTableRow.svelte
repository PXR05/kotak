<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import type { Row, Table as TanStackTable } from "@tanstack/table-core";
  import type { TrashedItem } from "$lib/types/file.js";
  import { selectedItems } from "$lib/stores";

  let {
    row,
    table,
    onHover,
  }: {
    row: Row<TrashedItem>;
    table: TanStackTable<TrashedItem>;
    onHover: (row: Row<TrashedItem>) => void;
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
    } else if (e.shiftKey) {
      const selectedRows = table.getSelectedRowModel().rows;
      if (selectedRows.length > 0) {
        const lastSelectedIndex = selectedRows[selectedRows.length - 1].index;
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
        row.toggleSelected();
      }
    } else {
      table.toggleAllPageRowsSelected(false);
      row.toggleSelected(true);
      selectedItems.length = 0;
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
  }
</script>

<Table.Row
  data-state={row.getIsSelected() && "selected"}
  class="hover:bg-muted/50 transition-none cursor-pointer"
  onclick={handleRowClick}
  ondblclick={handleRowDoubleClick}
  onmouseenter={() => onHover(row)}
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
