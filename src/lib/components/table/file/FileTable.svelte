<script lang="ts">
  import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FileItem, UploadableFile } from "$lib/types/file.js";
  import {
    type Row,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
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
  import FileContextMenu from "./FileContextMenu.svelte";
  import { onMount } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";

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
  let columnVisibility = $state<VisibilityState>({});

  $effect(() => {
    currentFolderId;
    rowSelection = {};
    if (lastSelectedIndex) {
      lastSelectedIndex.value = null;
    }
  });

  const ROW_HEIGHT = 48;
  const OVERSCAN = 20;
  let pagination = $state({
    offset: 0,
    pageSize: 20,
  });
  const range = $derived({
    start: Math.max(0, pagination.offset - OVERSCAN),
    end: Math.min(
      items.length,
      pagination.offset + pagination.pageSize + OVERSCAN
    ),
  });

  let containerRef = $state<HTMLDivElement | null>(null);

  function handleResize({ ref }: { ref: HTMLDivElement }) {
    if (!ref) return;
    const clientHeight = ref.clientHeight;
    const visibleRows = Math.ceil(clientHeight / ROW_HEIGHT);
    pagination.pageSize = visibleRows;

    if ((innerWidth.current ?? 0) < 768) {
      setTimeout(() => {
        columnVisibility = {
          type: false,
          size: false,
          updatedAt: false,
        };
      }, 0);
    } else {
      columnVisibility = {};
    }
  }

  function handleScroll(e: Event) {
    const ref = e.target as HTMLDivElement;
    const scrollTop = ref.scrollTop;
    pagination.offset = Math.floor(scrollTop / ROW_HEIGHT);
  }

  onMount(() => {
    if (containerRef) {
      handleResize({ ref: containerRef });
      window.addEventListener("resize", () =>
        handleResize({ ref: containerRef! })
      );
      containerRef.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (containerRef) {
        window.removeEventListener("resize", () =>
          handleResize({ ref: containerRef! })
        );
        containerRef.removeEventListener("scroll", handleScroll);
      }
    };
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
      get columnVisibility() {
        return columnVisibility;
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
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === "function") {
        columnVisibility = updater(columnVisibility);
      } else {
        columnVisibility = updater;
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

  let activeRow: Row<FileItem> | undefined = $state();
</script>

<svelte:window onkeydown={handleKeyDown} />

<DragDropZone class="flex flex-col relative transition-all duration-100 w-full">
  {#snippet children()}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col relative w-full h-[calc(100dvh-5.5rem-2px)]"
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

      <Table.Root bind:containerRef>
        <FileTableHeader {table} />
        <FileContextMenu item={activeRow?.original} rowItem={activeRow}>
          {#snippet children({ props, open })}
            <Table.Body {...props}>
              {#each table.getRowModel().rows as row, i}
                {@const inView = i >= range.start && i < range.end}
                {@const lockRow = open}
                {#if inView}
                  <FileTableRow
                    {row}
                    {table}
                    onHover={(r) => {
                      if (!lockRow) {
                        activeRow = r;
                      }
                    }}
                  />
                {:else}
                  <Table.Row style="height: {ROW_HEIGHT}px;"></Table.Row>
                {/if}
              {/each}
            </Table.Body>
          {/snippet}
        </FileContextMenu>
      </Table.Root>

      <FileTableEmptyState isEmpty={!table.getRowModel().rows?.length} />
    </div>
  {/snippet}
</DragDropZone>
