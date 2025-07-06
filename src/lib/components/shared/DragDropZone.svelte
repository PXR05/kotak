<script lang="ts">
  import { fileOperations } from "$lib/stores";
  import type { UploadableFile } from "$lib/types/file.js";
  import { UploadIcon } from "@lucide/svelte";

  let {
    class: className = "",
    dropZoneClass = "",
    onFilesDropped,
    children,
  }: {
    class?: string;
    dropZoneClass?: string;
    onFilesDropped?: (files: UploadableFile[]) => void;
    children: any;
  } = $props();

  let isDragOver = $state(false);
  let dragCounter = $state(0);

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    dragCounter++;
    if (dragCounter === 1) {
      isDragOver = true;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    dragCounter--;
    if (dragCounter === 0) {
      isDragOver = false;
    }
  }

  async function handleDrop(e: DragEvent) {
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
        if (onFilesDropped) {
          onFilesDropped(uploadableFiles);
        } else {
          fileOperations.handleFilesUpload(uploadableFiles);
        }
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
</script>

<div
  class={className}
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="File upload drop zone"
>
  {#if isDragOver}
    <div
      class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm {dropZoneClass}"
    >
      <div class="flex flex-col items-center gap-2 text-primary">
        <UploadIcon class="size-8" />
        <p class="text-lg font-medium">Drop files here to upload</p>
        <p class="text-sm text-muted-foreground">Release to upload files</p>
      </div>
    </div>
  {/if}

  {@render children()}
</div>
