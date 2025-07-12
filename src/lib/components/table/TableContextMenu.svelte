<script lang="ts">
  import { page } from "$app/state";
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import { fileOperations } from "$lib/stores";
  import { tableActions } from "$lib/utils/table-actions.svelte";
  import type { Snippet } from "svelte";
  import type { PageData } from "../../../routes/[...folder]/$types";
  import { LoaderIcon } from "@lucide/svelte";

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
    {#await (page.data as PageData).currentFolder}
      <ContextMenu.Item>
        <LoaderIcon class="size-4 animate-spin m-auto" />
      </ContextMenu.Item>
    {:then currentFolder}
      {#each tableActions() as action, index}
        {#if action.separator && index > 0}
          <ContextMenu.Separator />
        {/if}
        <ContextMenu.Item
          onclick={() =>
            fileOperations.handleContextMenuAction(action.id, currentFolder)}
          disabled={action.disabled}
          variant={action.variant}
        >
          <action.icon class="mr-2 size-4" />
          {action.label}
        </ContextMenu.Item>
      {/each}
    {/await}
  </ContextMenu.Content>
</ContextMenu.Root>
