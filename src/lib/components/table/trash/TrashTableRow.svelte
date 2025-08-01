<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import type { Row, Table as TanStackTable } from "@tanstack/table-core";
  import type { TrashedItem } from "$lib/types/file.js";
  import { UndoIcon, EyeIcon, Trash2Icon } from "@lucide/svelte";
  import { selectedItems } from "$lib/stores";

  let {
    row,
    table,
    onRestore,
    onPermanentDelete,
    onPreview,
  }: {
    row: Row<TrashedItem>;
    table: TanStackTable<TrashedItem>;
    onRestore: (item: TrashedItem) => void;
    onPermanentDelete: (item: TrashedItem) => void;
    onPreview: (item: TrashedItem) => void;
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

    const item = row.original;
    if (item.type === "file") {
      onPreview(item);
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
    {#if row.original.type === "file"}
      <ContextMenu.Item onclick={() => onPreview(row.original)}>
        <EyeIcon class="mr-2 size-4" />
        Preview
      </ContextMenu.Item>
      <ContextMenu.Separator />
    {/if}
    <ContextMenu.Item onclick={() => onRestore(row.original)}>
      <UndoIcon class="mr-2 size-4" />
      Restore
    </ContextMenu.Item>
    <ContextMenu.Item
      onclick={() => onPermanentDelete(row.original)}
      variant="destructive"
    >
      <Trash2Icon class="mr-2 size-4" />
      Permanently Delete
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
