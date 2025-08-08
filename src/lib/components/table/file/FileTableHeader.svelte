<script lang="ts">
  import type { FileItem } from "$lib/types/file.js";
  import type { Table as TanStackTable } from "@tanstack/table-core";
  import TableContextMenu from "../TableContextMenu.svelte";
  import TableHeaderContent from "$lib/components/table/TableHeaderContent.svelte";

  let {
    table,
  }: {
    table: TanStackTable<FileItem>;
  } = $props();
</script>

<TableContextMenu>
  {#snippet children({ props })}
    <TableHeaderContent {table} headerProps={props} enableResizeWidths={true} />
  {/snippet}
</TableContextMenu>
