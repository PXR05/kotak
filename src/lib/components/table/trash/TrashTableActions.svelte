<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { MoreHorizontalIcon, UndoIcon, Trash2Icon } from "@lucide/svelte";
  import type { TrashedItem } from "$lib/types/file.js";

  let {
    item,
    onRestore,
    onPermanentDelete,
  }: {
    item: TrashedItem;
    onRestore: (item: TrashedItem) => void;
    onPermanentDelete: (item: TrashedItem) => void;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" size="sm">
      <MoreHorizontalIcon class="size-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onclick={() => onRestore(item)}>
      <UndoIcon class="size-4 mr-2" />
      Restore
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item
      variant="destructive"
      onclick={() => onPermanentDelete(item)}
    >
      <Trash2Icon class="size-4 mr-2" />
      Permanently Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
