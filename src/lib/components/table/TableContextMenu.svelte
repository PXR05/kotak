<script lang="ts">
  import { page } from "$app/state";
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import { fileOperations } from "$lib/stores";
  import { tableActions } from "$lib/utils/table-actions.svelte";
  import type { Snippet } from "svelte";
  import type { PageData } from "../../../routes/[...folder]/$types";

  const {
    children,
  }: {
    children: Snippet<[{ props: Record<string, any> }]>;
  } = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      {@render children({ props })}
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#each tableActions() as action, index}
      {#if action.separator && index > 0}
        <ContextMenu.Separator />
      {/if}
      <ContextMenu.Item
        onclick={() =>
          fileOperations.handleContextMenuAction(
            action.id,
            (page.data as PageData).currentFolder
          )}
        disabled={action.disabled}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </ContextMenu.Item>
    {/each}
  </ContextMenu.Content>
</ContextMenu.Root>
