<script lang="ts">
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import type { Table as TanStackTable } from "@tanstack/table-core";
  import TableContextMenu from "./TableContextMenu.svelte";

  let {
    table,
    uploadDisabled = false,
  }: {
    table: TanStackTable<FileItem>;
    uploadDisabled?: boolean;
  } = $props();
</script>

<TableContextMenu {uploadDisabled}>
  {#snippet children({ props })}
    <Table.Header {...props}>
      {#each table.getHeaderGroups() as headerGroup}
        <Table.Row>
          {#each headerGroup.headers as header, i}
            <Table.Head
              colspan={header.colSpan}
              class="
            {header.column.id === 'actions' ? 'w-12' : ''} 
            {i === 0 ? 'pl-6' : ''} 
            py-4 "
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
