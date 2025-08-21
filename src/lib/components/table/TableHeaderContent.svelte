<script lang="ts">
  import { FlexRender } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { Table as TanStackTable } from "@tanstack/table-core";

  let {
    table,
    headerProps = {},
    enableResizeWidths = false,
    enableActionsFixedWidth = false,
  }: {
    table: TanStackTable<any>;
    headerProps?: Record<string, unknown>;
    enableResizeWidths?: boolean;
    enableActionsFixedWidth?: boolean;
  } = $props();
</script>

<Table.Header {...headerProps} class="bottom-border sticky top-0 bg-sidebar">
  {#each table.getHeaderGroups() as headerGroup}
    <Table.Row>
      {#each headerGroup.headers as header, i}
        <Table.Head
          colspan={header.colSpan}
          class="{enableActionsFixedWidth && header.column.id === 'actions'
            ? 'w-12'
            : ''} {i === 0 ? 'pl-5' : ''} md:py-4 py-2"
          style={enableResizeWidths
            ? `width: ${header.id !== "name" ? header.getSize() + "px" : "full"};`
            : undefined}
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
