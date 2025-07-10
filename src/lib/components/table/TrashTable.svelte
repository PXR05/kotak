<script lang="ts">
  import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { TrashedItem } from "$lib/types/file.js";
  import {
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    getSortedRowModel,
  } from "@tanstack/table-core";
  import TrashTableBulkActions from "./TrashTableBulkActions.svelte";
  import { createTrashTableColumns } from "./TrashTableColumns.js";
  import TrashTableHeader from "./TrashTableHeader.svelte";
  import TrashTableRow from "./TrashTableRow.svelte";
  import { openConfirmationDialog } from "$lib/stores/dialogs/confirmationDialog.svelte.js";
  import { openFilePreviewDialog } from "$lib/stores/dialogs/filePreviewDialog.svelte.js";
  import { fileOperations, selectedItems } from "$lib/stores";
  import { toast } from "svelte-sonner";
  import { TrashIcon } from "@lucide/svelte";
  import TrashTableContextMenu from "./TrashTableContextMenu.svelte";

  let {
    items,
    onRefresh,
    onEmptyTrash,
  }: {
    items: TrashedItem[];
    onRefresh: () => Promise<void>;
    onEmptyTrash?: () => void;
  } = $props();

  let sorting = $state<SortingState>([]);
  let rowSelection = $state<RowSelectionState>({});

  const handleRestore = async (item: TrashedItem) => {
    try {
      await fileOperations.restoreItem(item.itemId);
      await onRefresh();
    } catch (error) {
      console.error("Failed to restore item:", error);
    }
  };

  const handlePermanentDelete = async (item: TrashedItem) => {
    openConfirmationDialog(
      {
        title: `Permanently delete ${item.itemType}`,
        description: `Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`,
        confirmText: "Permanently Delete",
        cancelText: "Cancel",
        variant: "destructive",
      },
      async () => {
        try {
          await fileOperations.permanentlyDeleteItem(item.itemId);
          await onRefresh();
        } catch (error) {
          console.error("Failed to permanently delete item:", error);
        }
      }
    );
  };

  const handlePreview = (item: TrashedItem) => {
    if (item.itemType === "file") {
      const fileItem = {
        id: item.itemId,
        name: item.name,
        type: "file" as const,
        ownerId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        folderId: item.originalFolderId || "",
      };
      openFilePreviewDialog(fileItem);
    } else {
      toast.info("Folder preview not available in trash");
    }
  };

  const handleBulkRestore = async (selectedItems: TrashedItem[]) => {
    try {
      const restorePromises = selectedItems.map((item) =>
        fileOperations.restoreItem(item.itemId)
      );
      await Promise.all(restorePromises);
      await onRefresh();
      toast.success(`Restored ${selectedItems.length} item(s)`);
    } catch (error) {
      console.error("Failed to bulk restore:", error);
      toast.error("Failed to restore some items");
    }
  };

  const handleBulkDelete = (selectedItems: TrashedItem[]) => {
    openConfirmationDialog(
      {
        title: `Permanently delete ${selectedItems.length} items`,
        description: `Are you sure you want to permanently delete ${selectedItems.length} selected items? This action cannot be undone.`,
        confirmText: "Permanently Delete",
        cancelText: "Cancel",
        variant: "destructive",
      },
      async () => {
        try {
          const deletePromises = selectedItems.map((item) =>
            fileOperations.permanentlyDeleteItem(item.itemId)
          );
          await Promise.all(deletePromises);
          await onRefresh();
          toast.success(`Permanently deleted ${selectedItems.length} item(s)`);
        } catch (error) {
          console.error("Failed to bulk delete:", error);
          toast.error("Failed to delete some items");
        }
      }
    );
  };

  const columns = createTrashTableColumns(
    handleRestore,
    handlePermanentDelete,
    handlePreview
  );

  const table = createSvelteTable({
    get data() {
      return items;
    },
    columns,
    state: {
      get sorting() {
        return sorting;
      },
      get rowSelection() {
        return rowSelection;
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      if (typeof updater === "function") {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
    onRowSelectionChange: (updater) => {
      if (typeof updater === "function") {
        rowSelection = updater(rowSelection);
      } else {
        rowSelection = updater;
      }
    },
    enableRowSelection: true,
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      table.resetRowSelection();
    }
    if (event.ctrlKey && event.key === "a") {
      event.preventDefault();
      table.toggleAllRowsSelected();
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      !e ||
      !target ||
      (!target.closest("tr") &&
        !target.closest("button") &&
        !target.closest('[data-slot="button"]') &&
        !target.closest('[data-slot="dropdown-menu-trigger"]') &&
        !target.closest("input") &&
        !target.closest('[role="menuitem"]'))
    ) {
      table.toggleAllPageRowsSelected(false);
      selectedItems.length = 0;
    }
  }

  function handleContextAction(actionId: string) {
    switch (actionId) {
      case "refresh":
        onRefresh();
        break;
      case "empty-trash":
        if (onEmptyTrash) {
          openConfirmationDialog(
            {
              title: "Empty trash",
              description:
                "Are you sure you want to permanently delete all items in trash? This action cannot be undone.",
              confirmText: "Empty Trash",
              cancelText: "Cancel",
              variant: "destructive",
            },
            onEmptyTrash
          );
        }
        break;
      default:
        console.warn(`Unknown context action: ${actionId}`);
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flex flex-col relative w-full h-[calc(100dvh-10.75rem-2px)]"
  onclick={handleOutsideClick}
>
  {#if table.getFilteredSelectedRowModel().rows.length > 0}
    <TrashTableBulkActions
      {table}
      onBulkRestore={handleBulkRestore}
      onBulkDelete={handleBulkDelete}
    />
  {/if}

  <Table.Root>
    <Table.Table>
      <TrashTableHeader {table} onContextAction={handleContextAction} />
      <Table.Body>
        {#each table.getRowModel().rows as row}
          <TrashTableRow
            {row}
            {table}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onPreview={handlePreview}
          />
        {/each}
      </Table.Body>
    </Table.Table>
  </Table.Root>

  <TrashTableContextMenu onAction={handleContextAction}>
    {#snippet children({ props })}
      <div {...props} class="flex-1">
        {#if !table.getRowModel().rows?.length}
          <div class="m-auto size-full grid place-items-center">
            <div class="flex flex-col items-center gap-2 text-muted-foreground">
              <TrashIcon class="size-8" />
              <p class="text-lg font-medium">Trash is empty</p>
              <p class="text-sm">
                Items you delete will appear here until you permanently delete
                them or restore them.
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/snippet}
  </TrashTableContextMenu>
</div>
