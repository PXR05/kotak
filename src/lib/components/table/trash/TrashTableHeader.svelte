<script lang="ts">
  import type { TrashedItem } from "$lib/types/file.js";
  import type { Table as TanStackTable } from "@tanstack/table-core";
  import TrashTableContextMenu from "./TrashTableContextMenu.svelte";
  import TableHeaderContent from "$lib/components/table/TableHeaderContent.svelte";

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
    <TableHeaderContent
      {table}
      headerProps={props}
      enableActionsFixedWidth={true}
      enableResizeWidths={true}
    />
  {/snippet}
</TrashTableContextMenu>
