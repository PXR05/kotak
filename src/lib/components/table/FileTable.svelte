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
  import FileTableStorageInfo from "./FileTableStorageInfo.svelte";
  import FileTableBulkActions from "./FileTableBulkActions.svelte";
  import FileTableDropZone from "./FileTableDropZone.svelte";
  import FileTableHeader from "./FileTableHeader.svelte";
  import FileTableRow from "./FileTableRow.svelte";
  import FileTableEmptyState from "./FileTableEmptyState.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";
  import RenameDialog from "./RenameDialog.svelte";
  import CreateFolderDialog from "./CreateFolderDialog.svelte";
  import { invalidateAll } from "$app/navigation";
  import JSZip from "jszip";
  import { createFileActionHandler } from "./file-actions.js";
  import type { ConfirmationConfig } from "./ConfirmationDialog.svelte";
  import {
    createConfirmationDialogState,
    openConfirmationDialog,
    closeConfirmationDialog,
    createRenameDialogState,
    openRenameDialog,
    closeRenameDialog,
    createCreateFolderDialogState,
    openCreateFolderDialog,
    closeCreateFolderDialog,
    type ConfirmationDialogState,
    type RenameDialogState,
    type CreateFolderDialogState,
  } from "$lib/dialog-state.js";

  let {
    items,
    currentUserId = "user-1",
    currentFolderId = null,
    breadcrumbs = [],
    onItemClick,
    onAction,
    onFilesUpload,
    uploadDisabled = false,
    dialogsOpen = false,
  }: FileTableProps & { dialogsOpen?: boolean } = $props();

  let isDragOver = $state(false);
  let dragCounter = $state(0);
  let isDownloading = $state(false);
  let fileInputRef: HTMLInputElement;
  let folderInputRef: HTMLInputElement;
  let lastSelectedIndex = $state<number | null>(null);

  let confirmationDialog = $state<ConfirmationDialogState>(
    createConfirmationDialogState()
  );
  let renameDialog = $state<RenameDialogState>(createRenameDialogState());
  let createFolderDialog = $state<CreateFolderDialogState>(
    createCreateFolderDialogState()
  );

  function handleRowClick(item: FileItem) {
    onItemClick?.(item);
  }

  function handleAction(action: FileAction, item: FileItem) {
    onAction?.(action, item);
  }

  const sharedFileActionHandler = createFileActionHandler({
    onItemClick: handleRowClick,
    onConfirm: (config: ConfirmationConfig, onConfirm: () => void) => {
      confirmationDialog = openConfirmationDialog(
        confirmationDialog,
        config,
        onConfirm
      );
    },
    onRename: (
      item: FileItem,
      onRename: (newName: string) => Promise<void>
    ) => {
      renameDialog = openRenameDialog(renameDialog, item, onRename);
    },
  });

  function handleConfirmationConfirm() {
    confirmationDialog.callback?.();
    confirmationDialog = closeConfirmationDialog(confirmationDialog);
  }

  function handleConfirmationCancel() {
    confirmationDialog = closeConfirmationDialog(confirmationDialog);
  }

  async function handleRename(newName: string) {
    try {
      await renameDialog.callback?.(newName);
      renameDialog = closeRenameDialog(renameDialog);
    } catch (error) {}
  }

  function handleRenameCancel() {
    renameDialog = closeRenameDialog(renameDialog);
  }

  async function handleCreateFolder(name: string) {
    try {
      await createFolderDialog.callback?.(name);
      createFolderDialog = closeCreateFolderDialog(createFolderDialog);
    } catch (error) {}
  }

  function handleCreateFolderCancel() {
    createFolderDialog = closeCreateFolderDialog(createFolderDialog);
  }

  const columns = createFileTableColumns(currentUserId, handleAction);

  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
  let sorting = $state<SortingState>([]);
  let rowSelection = $state<RowSelectionState>({});

  $effect(() => {
    currentFolderId;
    rowSelection = {};
    lastSelectedIndex = null;
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

  function handleBulkDownload() {
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    const fileItems = selected.filter((item) => item.type === "file");
    if (fileItems.length === 0) return;

    isDownloading = true;
    downloadAsZip(fileItems).finally(() => {
      isDownloading = false;
    });
  }

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

  function handleBulkDelete() {
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    if (selected.length === 0) return;

    selected.forEach((item) => {
      handleAction("delete", item);
    });

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

  function handleUploadClick() {
    fileInputRef?.click();
  }

  function handleFolderUploadClick() {
    folderInputRef?.click();
  }

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0 && onFilesUpload) {
      const uploadableFiles: UploadableFile[] = Array.from(files).map(
        (file, index) => {
          // For folder uploads, extract the relative path from webkitRelativePath
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
    if (
      item &&
      (action === "open" ||
        action === "view" ||
        action === "download" ||
        action === "delete" ||
        action === "rename")
    ) {
      const fileAction = action === "view" ? "open" : (action as FileAction);
      sharedFileActionHandler(fileAction, item);
      return;
    }

    switch (action) {
      case "upload":
        handleUploadClick();
        break;
      case "upload-folder":
        handleFolderUploadClick();
        break;
      case "refresh":
        invalidateAll();
        break;
      case "select-all":
        table.toggleAllPageRowsSelected(true);
        const rows = table.getRowModel().rows;
        lastSelectedIndex = rows.length > 0 ? rows.length - 1 : null;
        break;
      case "deselect-all":
        table.toggleAllPageRowsSelected(false);
        lastSelectedIndex = null;
        break;
      case "create-folder":
        const performCreateFolder = async (name: string) => {
          try {
            const response = await fetch("/api/folders", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name,
                parentId: currentFolderId,
              }),
            });

            if (response.ok) {
              await invalidateAll();
            } else {
              const errorText = await response.text();
              throw new Error(`Failed to create folder: ${errorText}`);
            }
          } catch (error) {
            throw error;
          }
        };

        createFolderDialog = openCreateFolderDialog(
          createFolderDialog,
          performCreateFolder
        );
        break;
      default:
        break;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (
      confirmationDialog.open ||
      renameDialog.open ||
      createFolderDialog.open ||
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
      lastSelectedIndex = null;
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

  {#if table.getFilteredSelectedRowModel().rows.length === 0}
    <FileTableStorageInfo
      {breadcrumbs}
      {uploadDisabled}
      onUploadClick={onFilesUpload ? handleUploadClick : undefined}
      onFolderUploadClick={onFilesUpload ? handleFolderUploadClick : undefined}
    />
  {/if}

  {#if table.getFilteredSelectedRowModel().rows.length > 0}
    <FileTableBulkActions
      selectedCount={table.getFilteredSelectedRowModel().rows.length}
      totalCount={table.getFilteredRowModel().rows.length}
      {isDownloading}
      onBulkDownload={handleBulkDownload}
      onBulkDelete={handleBulkDelete}
      onDeselectAll={() => {
        handleContextMenuAction("deselect-all");
      }}
    />
  {/if}

  <Table.Root class="h-full">
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
            {lastSelectedIndex}
            onRowDoubleClick={handleRowClick}
            onContextMenuAction={handleContextMenuAction}
            onLastSelectedIndexChange={(index) => (lastSelectedIndex = index)}
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
    open={confirmationDialog.open}
    config={confirmationDialog.config}
    onConfirm={handleConfirmationConfirm}
    onCancel={handleConfirmationCancel}
  />

  <RenameDialog
    open={renameDialog.open}
    item={renameDialog.item}
    onRename={handleRename}
    onCancel={handleRenameCancel}
  />

  <CreateFolderDialog
    open={createFolderDialog.open}
    onCreateFolder={handleCreateFolder}
    onCancel={handleCreateFolderCancel}
  />
</div>
