<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import {
    MoreHorizontalIcon,
    UndoIcon,
    EyeIcon,
    Trash2Icon,
  } from "@lucide/svelte";
  import type { TrashedItem } from "$lib/types/file.js";

  let {
    item,
    onRestore,
    onPermanentDelete,
    onPreview,
  }: {
    item: TrashedItem;
    onRestore: (item: TrashedItem) => void;
    onPermanentDelete: (item: TrashedItem) => void;
    onPreview: (item: TrashedItem) => void;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" size="sm">
      <MoreHorizontalIcon class="size-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    {#if item.type === "file"}
      <DropdownMenu.Item onclick={() => onPreview(item)}>
        <EyeIcon class="size-4 mr-2" />
        Preview
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
    {/if}
    <DropdownMenu.Item onclick={() => onRestore(item)}>
      <UndoIcon class="size-4 mr-2" />
      Restore
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => onPermanentDelete(item)}
      class="text-destructive focus:text-destructive"
    >
      <Trash2Icon class="size-4 mr-2" />
      Permanently Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
