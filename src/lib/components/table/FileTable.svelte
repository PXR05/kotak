<script lang="ts">
  import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FileItem, UploadableFile } from "$lib/types/file.js";
  import {
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from "@tanstack/table-core";
  import JSZip from "jszip";
  import FileTableBulkActions from "./FileTableBulkActions.svelte";
  import { createFileTableColumns } from "./FileTableColumns.js";
  import FileTableDropZone from "./FileTableDropZone.svelte";
  import FileTableEmptyState from "./FileTableEmptyState.svelte";
  import FileTableHeader from "./FileTableHeader.svelte";
  import FileTableRow from "./FileTableRow.svelte";

  import {
    confirmationDialogData,
    createFolderDialogData,
    fileOperations,
    filePreviewDialogData,
    renameDialogData,
  } from "$lib/stores/index.js";

  import {
    currentUserId as currentUserIdStore,
    isDownloading,
    lastSelectedIndex,
  } from "$lib/stores/fileOperations.svelte.js";

  let {
    items,
    currentUserId = "user-1",
    currentFolderId = null,
    uploadDisabled = false,
  }: {
    items: FileItem[];
    currentUserId?: string;
    currentFolderId?: string | null;
    uploadDisabled?: boolean;
  } = $props();

  let isDragOver = $state(false);
  let dragCounter = $state(0);

  const columns = createFileTableColumns(
    currentUserIdStore.value || currentUserId,
    fileOperations.handleAction
  );

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
    getPaginationRowModel: getPaginationRowModel(),
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

  async function downloadAsZip(fileItems: FileItem[]) {
    try {
      const zip = new JSZip();

      await Promise.all(
        fileItems.map(async (item) => {
          try {
            if (!item.storageKey) {
              return;
            }

            const response = await fetch(
              `/api/files/${encodeURIComponent(item.storageKey)}?download=true`
            );
            if (!response.ok) {
              return;
            }

            const blob = await response.blob();
            zip.file(item.name, blob);
          } catch (error) {
            console.error(`Failed to download ${item.name}:`, error);
          }
        })
      );

      const fileCount = Object.keys(zip.files).length;
      if (fileCount === 0) {
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `files_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      fileItems.forEach((item) => {
        fileOperations.handleAction("download", item);
      });
    }
  }

  function handleBulkDownload() {
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    const fileItems = selected.filter((item) => item.type === "file");
    if (fileItems.length === 0) return;

    if (isDownloading) isDownloading.value = true;
    downloadAsZip(fileItems).finally(() => {
      if (isDownloading) isDownloading.value = false;
    });
  }

  function handleBulkDelete() {
    fileOperations.bulkDelete();
    table.toggleAllPageRowsSelected(false);
  }

  function handleDragEnter(e: DragEvent) {
    if (uploadDisabled) return;

    e.preventDefault();
    e.stopPropagation();

    dragCounter++;
    if (dragCounter === 1) {
      isDragOver = true;
    }
  }

  function handleDragOver(e: DragEvent) {
    if (uploadDisabled) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(e: DragEvent) {
    if (uploadDisabled) return;

    e.preventDefault();
    e.stopPropagation();

    dragCounter--;
    if (dragCounter === 0) {
      isDragOver = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    if (uploadDisabled) return;

    e.preventDefault();
    e.stopPropagation();

    isDragOver = false;
    dragCounter = 0;

    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      const uploadableFiles: UploadableFile[] = [];

      await Promise.all(
        Array.from(items).map(async (item) => {
          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              await processEntry(entry, uploadableFiles);
            }
          }
        })
      );

      if (uploadableFiles.length > 0) {
        fileOperations.handleFilesUpload(uploadableFiles);
      }
    }
  }

  async function processEntry(
    entry: FileSystemEntry,
    uploadableFiles: UploadableFile[],
    path = ""
  ) {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      return new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          const relativePath = path ? `${path}/${file.name}` : file.name;

          uploadableFiles.push({
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            relativePath,
          });
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirPath = path ? `${path}/${entry.name}` : entry.name;

      return new Promise<void>((resolve) => {
        const reader = dirEntry.createReader();
        reader.readEntries(async (entries) => {
          await Promise.all(
            entries.map((childEntry) =>
              processEntry(childEntry, uploadableFiles, dirPath)
            )
          );
          resolve();
        });
      });
    }
  }

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
    if (
      confirmationDialogData.open ||
      renameDialogData.open ||
      createFolderDialogData.open ||
      filePreviewDialogData.open
    ) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "a") {
        e.preventDefault();
        table.toggleAllPageRowsSelected(true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      table.toggleAllPageRowsSelected(false);
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
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="flex flex-col relative transition-all duration-100 border rounded-lg w-full h-full overflow-clip"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="File upload drop zone"
  onclick={handleOutsideClick}
>
  <FileTableDropZone {isDragOver} {uploadDisabled} />

  <!-- Hidden file input for upload -->
  <input
    type="file"
    multiple
    class="hidden"
    onchange={handleFileInputChange}
    disabled={uploadDisabled}
  />

  <!-- Hidden folder input for folder upload -->
  <input
    type="file"
    webkitdirectory
    class="hidden"
    onchange={handleFileInputChange}
    disabled={uploadDisabled}
  />

  {#if table.getFilteredSelectedRowModel().rows.length > 0}
    <FileTableBulkActions
      selectedCount={table.getFilteredSelectedRowModel().rows.length}
      totalCount={table.getFilteredRowModel().rows.length}
      onBulkDownload={handleBulkDownload}
      onBulkDelete={handleBulkDelete}
      onDeselectAll={() => table.toggleAllPageRowsSelected(false)}
    />
  {/if}

  <Table.Root>
    <FileTableHeader {table} {uploadDisabled} />
    {#if table.getRowModel().rows?.length}
      <Table.Body class="flex-1">
        {#each table.getRowModel().rows as row}
          <FileTableRow {row} {table} />
        {/each}
      </Table.Body>
    {/if}
  </Table.Root>
  <FileTableEmptyState
    {uploadDisabled}
    isEmpty={!table.getRowModel().rows?.length}
  />
</div>
