<script lang="ts">
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import type { Table as TanStackTable } from "@tanstack/table-core";
  import TableContextMenu from "../TableContextMenu.svelte";

  let {
    table,
  }: {
    table: TanStackTable<FileItem>;
  } = $props();
</script>

<TableContextMenu>
  {#snippet children({ props })}
    <Table.Header {...props} class="sticky top-0 bg-sidebar">
      {#each table.getHeaderGroups() as headerGroup}
        <Table.Row
          class={table.getRowModel().rows.length > 0 ? "thead-sep" : ""}
        >
          {#each headerGroup.headers as header, i}
            <Table.Head
              colspan={header.colSpan}
              style="width: {header.id !== 'name'
                ? header.getSize() + 'px'
                : 'full'};"
              class="{i === 0 ? 'pl-5' : ''} md:py-4 py-2"
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
</TableContextMenu>

<style>
  :global(.thead-sep::after) {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background-color: var(--border);
  }
</style>
