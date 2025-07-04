<script lang="ts">
  import {
    type PaginationState,
    type SortingState,
    type RowSelectionState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from "@tanstack/table-core";
  import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type {
    FileItem,
    FileAction,
    FileTableProps,
    UploadableFile,
  } from "$lib/types/file.js";
  import { createFileTableColumns } from "./FileTableColumns.js";
  import FileTableBulkActions from "./FileTableBulkActions.svelte";
  import FileTableDropZone from "./FileTableDropZone.svelte";
  import FileTableHeader from "./FileTableHeader.svelte";
  import FileTableRow from "./FileTableRow.svelte";
  import FileTableEmptyState from "./FileTableEmptyState.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";
  import RenameDialog from "./RenameDialog.svelte";
  import CreateFolderDialog from "./CreateFolderDialog.svelte";
  import JSZip from "jszip";

  // Import centralized state management
  import {
    fileOperations,
    confirmationDialogData,
    renameDialogData,
    createFolderDialogData,
    closeConfirmationDialog,
    closeRenameDialog,
    closeCreateFolderDialog,
  } from "$lib/stores/index.js";

  // Use getter functions for reactive state that we can't directly import
  import {
    isDownloading,
    lastSelectedIndex,
    currentUserId as currentUserIdStore,
  } from "$lib/stores/fileOperations.svelte.js";

  let {
    items,
    currentUserId = "user-1",
    currentFolderId = null,
    onItemClick,
    onAction,
    onFilesUpload,
    uploadDisabled = false,
    dialogsOpen = false,
  }: FileTableProps & { dialogsOpen?: boolean } = $props();

  let isDragOver = $state(false);
  let dragCounter = $state(0);
  let fileInputRef: HTMLInputElement;
  let folderInputRef: HTMLInputElement;

  function handleRowClick(item: FileItem) {
    onItemClick?.(item);
  }

  function handleAction(action: FileAction, item: FileItem) {
    onAction?.(action, item);
  }

  function handleConfirmationConfirm() {
    confirmationDialogData.callback?.();
    closeConfirmationDialog();
  }

  function handleConfirmationCancel() {
    closeConfirmationDialog();
  }

  async function handleRename(newName: string) {
    try {
      await renameDialogData.callback?.(newName);
      closeRenameDialog();
    } catch (error) {}
  }

  function handleRenameCancel() {
    closeRenameDialog();
  }

  async function handleCreateFolder(name: string) {
    try {
      await createFolderDialogData.callback?.(name);
      closeCreateFolderDialog();
    } catch (error) {}
  }

  function handleCreateFolderCancel() {
    closeCreateFolderDialog();
  }

  const columns = createFileTableColumns(
    currentUserIdStore.value || currentUserId,
    handleAction
  );

  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
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
      get pagination() {
        return pagination;
      },
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
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        pagination = updater(pagination);
      } else {
        pagination = updater;
      }
    },
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
              `/api/storage?key=${encodeURIComponent(item.storageKey)}&download=true`
            );
            if (!response.ok) {
              return;
            }

            const blob = await response.blob();
            zip.file(item.name, blob);
          } catch (error) {
            // Silently skip failed downloads
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
        handleAction("download", item);
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
    rowSelection = {};
  }

  function handleDragEnter(e: DragEvent) {
    if (uploadDisabled || !onFilesUpload) return;

    e.preventDefault();
    e.stopPropagation();

    dragCounter++;
    if (dragCounter === 1) {
      isDragOver = true;
    }
  }

  function handleDragOver(e: DragEvent) {
    if (uploadDisabled || !onFilesUpload) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(e: DragEvent) {
    if (uploadDisabled || !onFilesUpload) return;

    e.preventDefault();
    e.stopPropagation();

    dragCounter--;
    if (dragCounter === 0) {
      isDragOver = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    if (uploadDisabled || !onFilesUpload) return;

    e.preventDefault();
    e.stopPropagation();

    isDragOver = false;
    dragCounter = 0;

    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      const uploadableFiles: UploadableFile[] = [];

      // Process all dropped items (files and folders)
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
        onFilesUpload(uploadableFiles);
      }
    }
  }

  // Recursively process directory entries
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
    if (files && files.length > 0 && onFilesUpload) {
      const uploadableFiles: UploadableFile[] = Array.from(files).map(
        (file, index) => {
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
      onFilesUpload(uploadableFiles);
      target.value = "";
    }
  }

  function handleContextMenuAction(action: string, item?: FileItem) {
    fileOperations.handleContextMenuAction(action, item);
    if (action === "select-all") {
      table.toggleAllPageRowsSelected(true);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (
      confirmationDialogData.open ||
      renameDialogData.open ||
      createFolderDialogData.open ||
      dialogsOpen
    ) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "a") {
        e.preventDefault();
        handleContextMenuAction("select-all");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleContextMenuAction("deselect-all");
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      !target.closest("tr") &&
      !target.closest("button") &&
      !target.closest('[data-slot="button"]') &&
      !target.closest('[data-slot="dropdown-menu-trigger"]') &&
      !target.closest("input") &&
      !target.closest('[role="menuitem"]')
    ) {
      table.toggleAllPageRowsSelected(false);
      if (lastSelectedIndex) lastSelectedIndex.value = null;
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
  <FileTableDropZone {isDragOver} {uploadDisabled} {onFilesUpload} />

  <!-- Hidden file input for upload -->
  <input
    bind:this={fileInputRef}
    type="file"
    multiple
    class="hidden"
    onchange={handleFileInputChange}
    disabled={uploadDisabled}
  />

  <!-- Hidden folder input for folder upload -->
  <input
    bind:this={folderInputRef}
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
      isDownloading={isDownloading?.value || false}
      onBulkDownload={handleBulkDownload}
      onBulkDelete={handleBulkDelete}
      onDeselectAll={() => {
        handleContextMenuAction("deselect-all");
      }}
    />
  {/if}

  <Table.Root>
    <FileTableHeader
      {table}
      {uploadDisabled}
      onContextMenuAction={handleContextMenuAction}
    />
    {#if table.getRowModel().rows?.length}
      <Table.Body class="flex-1">
        {#each table.getRowModel().rows as row}
          <FileTableRow
            {row}
            {table}
            lastSelectedIndex={lastSelectedIndex?.value || null}
            onRowDoubleClick={handleRowClick}
            onContextMenuAction={handleContextMenuAction}
            onLastSelectedIndexChange={(index) => {
              if (lastSelectedIndex) lastSelectedIndex.value = index;
            }}
          />
        {/each}
      </Table.Body>
    {/if}
  </Table.Root>
  <FileTableEmptyState
    {uploadDisabled}
    isEmpty={!table.getRowModel().rows?.length}
    onContextMenuAction={handleContextMenuAction}
  />

  <ConfirmationDialog
    open={confirmationDialogData.open}
    config={confirmationDialogData.config}
    onConfirm={handleConfirmationConfirm}
    onCancel={handleConfirmationCancel}
  />

  <RenameDialog
    open={renameDialogData.open}
    item={renameDialogData.item}
    onRename={handleRename}
    onCancel={handleRenameCancel}
  />

  <CreateFolderDialog
    open={createFolderDialogData.open}
    onCreateFolder={handleCreateFolder}
    onCancel={handleCreateFolderCancel}
  />
</div>
