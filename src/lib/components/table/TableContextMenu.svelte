<script lang="ts">
  import { page } from "$app/state";
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import { fileOperations } from "$lib/stores";
  import { tableActions } from "$lib/utils/table-actions.svelte";
  import type { Snippet } from "svelte";
  import { LoaderIcon } from "@lucide/svelte";
  import type { FileItem } from "$lib/types/file";
  import { getCurrentFolder } from "$lib/remote/load.remote";
  import { toast } from "svelte-sonner";

  const {
    children,
  }: {
    children: Snippet<[{ props: Record<string, any> }]>;
  } = $props();

  let currentFolder = $state<FileItem>();
  let loading = $state(true);

  $effect(() => {
    loading = true;
    try {
      getCurrentFolder(page.data.currentFolderId).then(({ data, error }) => {
        if (error) {
          toast.error(error);
        } else {
          currentFolder = data;
        }
        loading = false;
      });
    } catch (error) {
      console.error("Error fetching current folder:", error);
      toast.error("Failed to load current folder");
      loading = false;
    }
  });
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      {@render children({ props })}
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    {#if loading}
      <ContextMenu.Item>
        <LoaderIcon class="size-4 animate-spin m-auto" />
      </ContextMenu.Item>
    {:else if currentFolder}
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
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>
