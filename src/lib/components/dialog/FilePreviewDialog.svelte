<script lang="ts">
  import { Dialog, DialogContent } from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { FileItem, FileAction } from "$lib/types/file.js";
  import {
    XIcon,
    DownloadIcon,
    TrashIcon,
    ZoomInIcon,
    ZoomOutIcon,
    RotateCwIcon,
    FileIcon,
    FileTextIcon,
    ImageIcon,
    VideoIcon,
    MusicIcon,
    LoaderIcon,
    Share2Icon,
  } from "@lucide/svelte";
  import {
    closeFilePreviewDialog,
    fileOperations,
    filePreviewDialogData,
  } from "$lib/stores";
  import { formatFileSize } from "$lib/utils/format";

  // Props for external control (used by shared files)
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

  // Use external props if provided, otherwise fall back to store
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
        // For shared files, use the external URL with download parameter
        downloadUrl = `${externalGetFileUrl(file)}?download=true`;
      } else {
        // For regular files
        downloadUrl = `/api/files/${encodeURIComponent(file.storageKey)}?download=true`;
      }

      window.open(downloadUrl, "_blank");
    }
  }

  const FILE_TYPES = {
    image: {
      check: (mimeType: string) => mimeType.startsWith("image/"),
      icon: ImageIcon,
      supportsZoom: true,
      supportsRotation: true,
    },
    video: {
      check: (mimeType: string) => mimeType.startsWith("video/"),
      icon: VideoIcon,
      supportsZoom: false,
      supportsRotation: false,
    },
    audio: {
      check: (mimeType: string) => mimeType.startsWith("audio/"),
      icon: MusicIcon,
      supportsZoom: false,
      supportsRotation: false,
    },
    pdf: {
      check: (mimeType: string) => mimeType === "application/pdf",
      icon: FileIcon,
      supportsZoom: false,
      supportsRotation: false,
    },
    text: {
      check: (mimeType: string) =>
        mimeType.startsWith("text/") ||
        [
          "application/json",
          "application/javascript",
          "application/xml",
        ].includes(mimeType),
      icon: FileTextIcon,
      supportsZoom: false,
      supportsRotation: false,
    },
  } as const;

  function getFileUrl(file: FileItem): string | null {
    // Use external getFileUrl function if provided
    if (externalGetFileUrl) {
      return externalGetFileUrl(file);
    }

    return file.storageKey
      ? `/api/files/${encodeURIComponent(file.storageKey)}`
      : null;
  }

  function getFileType(
    mimeType: string | undefined
  ): keyof typeof FILE_TYPES | null {
    if (!mimeType) return null;

    for (const [type, config] of Object.entries(FILE_TYPES)) {
      if (config.check(mimeType)) {
        return type as keyof typeof FILE_TYPES;
      }
    }
    return null;
  }

  function getFileIcon(mimeType: string | undefined) {
    const fileType = getFileType(mimeType);
    return fileType ? FILE_TYPES[fileType].icon : FileIcon;
  }

  function supportsZoom(mimeType: string | undefined): boolean {
    const fileType = getFileType(mimeType);
    return fileType ? FILE_TYPES[fileType].supportsZoom : false;
  }

  const fileType = $derived(getFileType(file?.mimeType));
  const fileUrl = $derived(file ? getFileUrl(file) : null);

  const styles = {
    background:
      "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2",
    separator: "w-0.5 h-6 bg-border rounded-full",
  } as const;

  function handleMediaLoad() {
    isLoading = false;
  }

  function handleMediaError(type: string) {
    error = `Failed to load ${type}`;
  }
</script>

<Dialog {open} onOpenChange={handleClose}>
  <DialogContent
    class="!max-w-screen w-screen h-screen flex flex-col p-0 gap-0 rounded-none border-none bg-black/25 backdrop-blur"
    showCloseButton={false}
  >
    {#if file}
      <!-- Header with actions -->
      <div class="w-full flex items-start justify-between p-4">
        <div class="{styles.background} gap-3 px-4">
          {#if file.mimeType}
            {@const Icon = getFileIcon(file.mimeType)}
            <Icon
              class="size-9 text-muted-foreground"
              absoluteStrokeWidth
              strokeWidth={1.5}
            />
          {/if}
          <span class={styles.separator}></span>
          <div>
            <h2 class="font-medium text-lg">{file.name}</h2>
            <p class="text-sm text-muted-foreground">
              {formatFileSize(file.size || 0)} • {file.mimeType ||
                "Unknown type"}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Zoom and rotation controls -->
          {#if supportsZoom(file.mimeType)}
            <div class="{styles.background} !p-1">
              <Button
                variant="ghost"
                size="icon"
                onclick={handleZoomOut}
                disabled={zoom <= 25}
              >
                <ZoomOutIcon class="size-4" />
              </Button>
              <span
                class="justify-center text-sm font-medium text-muted-foreground w-14 text-center"
              >
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onclick={handleZoomIn}
                disabled={zoom >= 300}
              >
                <ZoomInIcon class="size-4" />
              </Button>
              <span class={styles.separator}></span>
              <Button variant="ghost" size="icon" onclick={handleRotate}>
                <RotateCwIcon class="size-4" />
              </Button>
            </div>
          {/if}

          <div class="{styles.background} !p-1">
            <Button
              variant="ghost"
              size="sm"
              onclick={handleDownload}
              class="h-9"
            >
              <DownloadIcon class="size-4" />
              Download
            </Button>
            {#if showActions}
              <span class={styles.separator}></span>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => handleAction("share")}
                class="h-9"
              >
                <Share2Icon class="size-4" />
                Share
              </Button>
              <span class={styles.separator}></span>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => handleAction("delete")}
                class="text-destructive hover:text-destructive h-9"
              >
                <TrashIcon class="size-4" />
                Delete
              </Button>
            {/if}
          </div>

          <Button
            variant="ghost"
            size="icon"
            class="{styles.background} size-11"
            onclick={handleClose}
          >
            <XIcon class="size-4" />
          </Button>
        </div>
      </div>

      <div class="flex-1 -z-1 relative">
        <div class="absolute inset-0 flex items-center justify-center">
          {#if isLoading}
            <div class="text-center grid place-items-center">
              <LoaderIcon class="size-6 animate-spin" />
              <p class="text-muted-foreground mt-2">Loading</p>
            </div>
          {:else if error}
            <div class="text-center">
              <FileIcon class="size-12 text-muted-foreground mx-auto mb-2" />
              <p class="text-sm text-muted-foreground">{error}</p>
            </div>
          {:else if file.storageKey && fileType}
            {#if fileType === "image"}
              <img
                src={fileUrl}
                alt={file.name}
                class="object-contain transition-transform duration-200"
                style="scale: {zoom}%; transform: rotate({rotation}deg);"
                onload={handleMediaLoad}
                onerror={() => handleMediaError("image")}
              />
            {:else if fileType === "video"}
              <video
                controls
                class="max-w-full max-h-full"
                onloadstart={handleMediaLoad}
                onerror={() => handleMediaError("video")}
              >
                <source src={fileUrl} type={file.mimeType} />
                <track kind="captions" />
                Your browser does not support the video element.
              </video>
            {:else if fileType === "audio"}
              <div class="text-center">
                <MusicIcon class="size-16 text-muted-foreground mx-auto mb-4" />
                <audio
                  controls
                  class="mx-auto"
                  onloadstart={handleMediaLoad}
                  onerror={() => handleMediaError("audio")}
                >
                  <source src={fileUrl} type={file.mimeType} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            {:else if fileType === "pdf"}
              <object
                data={fileUrl}
                type="application/pdf"
                class="w-full h-full"
                title={file.name}
                onload={handleMediaLoad}
                onerror={() => handleMediaError("PDF")}
              >
                <div class="text-center p-8">
                  <FileIcon
                    class="size-16 text-muted-foreground mx-auto mb-4"
                  />
                  <h3 class="text-lg font-semibold mb-2">
                    PDF Preview Unavailable
                  </h3>
                  <p class="text-sm text-muted-foreground mb-4">
                    Your browser doesn't support inline PDF viewing.
                  </p>
                  <Button onclick={handleDownload}>
                    <DownloadIcon class="size-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </object>
            {:else if fileType === "text"}
              <div class="w-full h-full max-w-4xl mx-auto">
                <iframe
                  src={fileUrl}
                  class="w-full h-full border border-border rounded-lg bg-background"
                  title={file.name}
                  onload={handleMediaLoad}
                  onerror={() => handleMediaError("text file")}
                ></iframe>
              </div>
            {/if}
          {:else}
            <div class="text-center">
              {#if file.mimeType}
                {@const Icon = getFileIcon(file.mimeType)}
                <Icon class="size-16 text-muted-foreground mx-auto mb-4" />
              {:else}
                <FileIcon class="size-16 text-muted-foreground mx-auto mb-4" />
              {/if}
              <h3 class="text-lg font-semibold mb-2">Preview not available</h3>
              <p class="text-sm text-muted-foreground mb-4">
                {#if !file.storageKey}
                  File not found in storage.
                {:else}
                  This file type cannot be previewed in the browser.
                {/if}
              </p>
              {#if file.storageKey}
                <Button onclick={handleDownload}>
                  <DownloadIcon class="size-4 mr-2" />
                  Download to view
                </Button>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Bottom controls -->
      <div class="{styles.background} w-fit m-4 px-2">
        <div
          class="flex items-center gap-4 text-sm font-medium text-muted-foreground"
        >
          <span>Created: {file.createdAt.toLocaleString()}</span>
          <span class={styles.separator}></span>
          <span>Modified: {file.updatedAt.toLocaleString()}</span>
          {#if file.ownerId}
            <span class={styles.separator}></span>
            <span>Owner: {file.ownerId}</span>
          {/if}
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>
