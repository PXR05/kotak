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
  import { invalidateAll } from "$app/navigation";
  import JSZip from "jszip";

  let {
    items,
    currentUserId = "user-1",
    currentFolderId = null,
    breadcrumbs = [],
    onItemClick,
    onAction,
    onFilesUpload,
    uploadDisabled = false,
  }: FileTableProps = $props();

  let isDragOver = $state(false);
  let dragCounter = $state(0);
  let isDownloading = $state(false);
  let fileInputRef: HTMLInputElement;
  let folderInputRef: HTMLInputElement;
  let lastSelectedIndex = $state<number | null>(null);

  // Remove storage statistics since we're replacing with breadcrumbs

  function handleRowClick(item: FileItem) {
    onItemClick?.(item);
  }

  function handleAction(action: FileAction, item: FileItem) {
    onAction?.(action, item);
  }

  // Define columns for the data table
  const columns = createFileTableColumns(currentUserId, handleAction);

  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
  let sorting = $state<SortingState>([]);
  let rowSelection = $state<RowSelectionState>({});

  // Clear selection when navigating to a different folder
  $effect(() => {
    // This effect will run whenever currentFolderId changes
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

      // Add each file to the zip
      await Promise.all(
        fileItems.map(async (item) => {
          try {
            if (!item.storageKey) {
              console.error(`No storage key for ${item.name}`);
              return;
            }

            // Fetch the file content from your storage API
            const response = await fetch(
              `/api/storage?key=${encodeURIComponent(item.storageKey)}&download=true`
            );
            if (!response.ok) {
              console.error(
                `Failed to download ${item.name}:`,
                response.statusText
              );
              return;
            }

            const blob = await response.blob();
            zip.file(item.name, blob);
          } catch (error) {
            console.error(`Error downloading ${item.name}:`, error);
          }
        })
      );

      // Check if any files were successfully added
      const fileCount = Object.keys(zip.files).length;
      if (fileCount === 0) {
        console.error("No files were successfully added to the zip");
        return;
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `files_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating zip file:", error);
      // Fallback to individual downloads if zip creation fails
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
    // Trigger delete action for all selected items
    selected.forEach((item) => {
      handleAction("delete", item);
    });
    // Clear selection after delete
    rowSelection = {};
  }

  // Drag and drop handlers
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

    // Show copy cursor
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
          if (path) {
            console.log(`  ${file.name} -> ${relativePath}`);
          }
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
      console.log(`Processing folder: ${entry.name}`);

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
      console.log(`File input: ${files.length} files selected`);

      const uploadableFiles: UploadableFile[] = Array.from(files).map(
        (file, index) => {
          // For folder uploads, extract the relative path from webkitRelativePath
          const webkitPath = (file as any).webkitRelativePath;
          const relativePath = webkitPath || file.name;

          if (webkitPath && webkitPath !== file.name) {
            console.log(`  ${file.name} -> ${webkitPath}`);
          }

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
      // Reset the input
      target.value = "";
    }
  }

  // Context menu handlers
  function handleContextMenuAction(action: string, item?: FileItem) {
    switch (action) {
      case "view":
        if (item) {
          handleRowClick(item);
        }
        break;
      case "download":
        if (item) {
          handleAction("download", item);
        }
        break;
      case "delete":
        if (item) {
          handleAction("delete", item);
        }
        break;
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
        // Set lastSelectedIndex to the last row when selecting all
        const rows = table.getRowModel().rows;
        lastSelectedIndex = rows.length > 0 ? rows.length - 1 : null;
        break;
      case "deselect-all":
        table.toggleAllPageRowsSelected(false);
        lastSelectedIndex = null;
        break;
      case "create-folder":
        // TODO: Implement create folder functionality
        console.log("Create folder action not implemented yet");
        break;
      default:
        console.log("Unknown action:", action);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
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
  class="relative transition-all duration-100 border rounded-lg w-full h-full overflow-clip"
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

  <!-- Navigation breadcrumbs bar (shown when no items selected) -->
  {#if table.getFilteredSelectedRowModel().rows.length === 0}
    <FileTableStorageInfo
      {breadcrumbs}
      {uploadDisabled}
      onUploadClick={onFilesUpload ? handleUploadClick : undefined}
      onFolderUploadClick={onFilesUpload ? handleFolderUploadClick : undefined}
    />
  {/if}

  <!-- Bulk actions bar (shown when items selected) -->
  {#if table.getFilteredSelectedRowModel().rows.length > 0}
    <FileTableBulkActions
      selectedCount={table.getFilteredSelectedRowModel().rows.length}
      totalCount={table.getFilteredRowModel().rows.length}
      {isDownloading}
      onBulkDownload={handleBulkDownload}
      onBulkDelete={handleBulkDelete}
    />
  {/if}

  <Table.Root>
    <FileTableHeader
      {table}
      {uploadDisabled}
      onContextMenuAction={handleContextMenuAction}
    />
    <Table.Body>
      {#if table.getRowModel().rows?.length}
        {#each table.getRowModel().rows as row}
          <FileTableRow
            {row}
            {table}
            {lastSelectedIndex}
            onRowClick={handleRowClick}
            onRowDoubleClick={handleRowClick}
            onContextMenuAction={handleContextMenuAction}
            onLastSelectedIndexChange={(index) => (lastSelectedIndex = index)}
          />
        {/each}
      {:else}
        <FileTableEmptyState
          columnsLength={columns.length}
          {uploadDisabled}
          onContextMenuAction={handleContextMenuAction}
        />
      {/if}
    </Table.Body>
  </Table.Root>
</div>
