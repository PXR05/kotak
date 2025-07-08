<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import { fileOperations } from "$lib/stores";
  import { fileActions } from "$lib/utils/file-actions.svelte";
  import type { Snippet } from "svelte";

  let {
    item,
    children,
  }: { item: FileItem; children: Snippet<[{ props: Record<string, any> }]> } =
    $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      {@render children?.({ props })}
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#each fileActions() as action, index}
      {#if action.separator && index > 0}
        <ContextMenu.Separator />
      {/if}
      <ContextMenu.Item
        onclick={() => fileOperations.handleContextMenuAction(action.id, item)}
        disabled={action.disabled}
        variant={action.variant}
      >
        <action.icon class="mr-2 size-4" />
        {action.label}
      </ContextMenu.Item>
    {/each}
  </ContextMenu.Content>
</ContextMenu.Root>
