<script lang="ts">
  import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FileItem, UploadableFile } from "$lib/types/file.js";
  import {
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    getSortedRowModel,
  } from "@tanstack/table-core";
  import FileTableBulkActions from "./FileTableBulkActions.svelte";
  import { createFileTableColumns } from "./FileTableColumns.js";
  import DragDropZone from "$lib/components/shared/DragDropZone.svelte";
  import FileTableEmptyState from "./FileTableEmptyState.svelte";
  import FileTableHeader from "./FileTableHeader.svelte";
  import FileTableRow from "./FileTableRow.svelte";

  import {
    confirmationDialogData,
    createFolderDialogData,
    fileOperations,
    filePreviewDialogData,
    renameDialogData,
    selectedItems,
  } from "$lib/stores";

  import { lastSelectedIndex } from "$lib/stores";

  let {
    items,
    currentFolderId = null,
  }: {
    items: FileItem[];
    currentFolderId?: string | null;
  } = $props();

  const columns = createFileTableColumns(fileOperations.handleAction);

  let sorting = $state<SortingState>([]);
  let rowSelection = $state<RowSelectionState>({});

  $effect(() => {
    currentFolderId;
    rowSelection = {};
    if (lastSelectedIndex) {
      lastSelectedIndex.value = null;
    }
  });

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

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      const uploadableFiles: UploadableFile[] = Array.from(files).map(
        (file) => {
          const webkitPath = (file as any).webkitRelativePath;
          const relativePath = webkitPath || file.name;

          return {
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            relativePath:
              webkitPath && webkitPath !== file.name ? relativePath : undefined,
          };
        }
      );
      fileOperations.handleFilesUpload(uploadableFiles);
      target.value = "";
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (
      confirmationDialogData.open ||
      renameDialogData.open ||
      createFolderDialogData.open ||
      filePreviewDialogData.open ||
      target.closest("input")
    ) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "a") {
        e.preventDefault();
        table.toggleAllPageRowsSelected(true);
        selectedItems.length = 0;
        selectedItems.push(...table.getRowModel().rows.map((r) => r.original));
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      table.toggleAllPageRowsSelected(false);
      selectedItems.length = 0;
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
</script>

<svelte:window onkeydown={handleKeyDown} />

<DragDropZone
  class="flex flex-col relative transition-all duration-100 w-full h-[calc(100dvh-5.5rem-2px)]"
>
  {#snippet children()}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col relative w-full h-full"
      onclick={handleOutsideClick}
    >
      <input
        type="file"
        multiple
        class="hidden"
        onchange={handleFileInputChange}
      />

      <input
        type="file"
        webkitdirectory
        class="hidden"
        onchange={handleFileInputChange}
      />

      {#if table.getFilteredSelectedRowModel().rows.length > 0}
        <FileTableBulkActions {table} />
      {/if}

      <Table.Root>
        <FileTableHeader {table} />
        <Table.Body>
          {#each table.getRowModel().rows as row}
            <FileTableRow {row} {table} />
          {/each}
        </Table.Body>
      </Table.Root>

      <FileTableEmptyState isEmpty={!table.getRowModel().rows?.length} />
    </div>
  {/snippet}
</DragDropZone>
