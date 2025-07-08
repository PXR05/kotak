<script lang="ts">
  import { Dialog, DialogContent } from "$lib/components/ui/dialog/index.js";
  import type { FileItem, FileAction } from "$lib/types/file.js";
  import {
    closeFilePreviewDialog,
    fileOperations,
    filePreviewDialogData,
  } from "$lib/stores";
  import FilePreviewHeader from "./FilePreviewHeader.svelte";
  import FilePreviewContent from "./FilePreviewContent.svelte";
  import FilePreviewFooter from "./FilePreviewFooter.svelte";

  let {
    open: externalOpen = undefined,
    file: externalFile = undefined,
    onClose: externalOnClose = undefined,
    getFileUrl: externalGetFileUrl = undefined,
    showActions = true,
  }: {
    open?: boolean;
    file?: FileItem | null;
    onClose?: () => void;
    getFileUrl?: (file: FileItem) => string | null;
    showActions?: boolean;
  } = $props();

  let zoom = $state(100);
  let rotation = $state(0);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const file = $derived(
    externalFile !== undefined ? externalFile : filePreviewDialogData.file
  );
  const open = $derived(
    externalOpen !== undefined ? externalOpen : filePreviewDialogData.open
  );

  function handleClose() {
    if (externalOnClose) {
      externalOnClose();
    } else {
      closeFilePreviewDialog();
    }
    zoom = 100;
    rotation = 0;
    error = null;
  }

  function handleAction(action: FileAction) {
    if (file) {
      fileOperations.handleAction(action, file, handleClose);
    }
  }

  function handleZoomIn() {
    zoom = Math.min(zoom + 25, 300);
  }

  function handleZoomOut() {
    zoom = Math.max(zoom - 25, 25);
  }

  function handleRotate() {
    rotation = rotation + 90;
  }

  function handleDownload() {
    if (file && file.storageKey) {
      let downloadUrl: string;

      if (externalGetFileUrl) {
        downloadUrl = `${externalGetFileUrl(file)}?download=true`;
      } else {
        downloadUrl = `/api/files/${encodeURIComponent(file.storageKey)}?download=true`;
      }

      window.open(downloadUrl, "_blank");
    }
  }

  function getFileUrl(file: FileItem): string | null {
    if (externalGetFileUrl) {
      return externalGetFileUrl(file);
    }

    return file.storageKey
      ? `/api/files/${encodeURIComponent(file.storageKey)}`
      : null;
  }

  const fileUrl = $derived(file ? getFileUrl(file) : null);

  function handleMediaLoad() {
    isLoading = false;
  }

  function handleMediaError(type: string) {
    error = `Failed to load ${type}`;
  }
</script>

<Dialog {open} onOpenChange={handleClose}>
  <DialogContent
    class="!max-w-screen w-screen h-screen flex flex-col p-0 gap-0 rounded-none border-none bg-background/25 backdrop-blur"
    showCloseButton={false}
  >
    {#if file}
      <FilePreviewHeader
        {file}
        {zoom}
        onClose={handleClose}
        onAction={handleAction}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onDownload={handleDownload}
        {showActions}
      />

      <FilePreviewContent
        {file}
        {fileUrl}
        {zoom}
        {rotation}
        {isLoading}
        {error}
        onDownload={handleDownload}
        onMediaLoad={handleMediaLoad}
        onMediaError={handleMediaError}
      />

      <FilePreviewFooter {file} />
    {/if}
  </DialogContent>
</Dialog>
