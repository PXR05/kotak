<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import { trashTableActions } from "$lib/utils/trash-table-actions.svelte";
  import type { Snippet } from "svelte";

  const {
    children,
    onAction,
  }: {
    children: Snippet<[{ props: Record<string, any> }]>;
    onAction: (actionId: string) => void;
  } = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      {@render children({ props })}
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#each trashTableActions() as action, index}
      {#if action.separator && index > 0}
        <ContextMenu.Separator />
      {/if}
      <ContextMenu.Item
        onclick={() => onAction(action.id)}
        disabled={action.disabled}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </ContextMenu.Item>
    {/each}
  </ContextMenu.Content>
</ContextMenu.Root>
