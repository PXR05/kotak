<script lang="ts">
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { TrashedItem } from "$lib/types/file.js";
  import type { Table as TanStackTable } from "@tanstack/table-core";
  import TrashTableContextMenu from "./TrashTableContextMenu.svelte";

  let {
    table,
    onContextAction,
  }: {
    table: TanStackTable<TrashedItem>;
    onContextAction: (actionId: string) => void;
  } = $props();
</script>

<TrashTableContextMenu onAction={onContextAction}>
  {#snippet children({ props })}
    <Table.Header {...props} class="bottom-border sticky top-0 bg-sidebar">
      {#each table.getHeaderGroups() as headerGroup}
        <Table.Row
        >
          {#each headerGroup.headers as header, i}
            <Table.Head
              colspan={header.colSpan}
              class="
            {header.column.id === 'actions' ? 'w-12' : ''} 
            {i === 0 ? 'pl-5' : ''} 
            md:py-4 py-2"
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
</TrashTableContextMenu>
