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
  } from "@lucide/svelte";
  import {
    closeFilePreviewDialog,
    fileOperations,
    filePreviewDialogData,
  } from "$lib/stores";
  import { formatFileSize } from "$lib/utils/format";
  import { Separator } from "../ui/separator";

  let zoom = $state(100);
  let rotation = $state(0);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const file = $derived(filePreviewDialogData.file);
  const open = $derived(filePreviewDialogData.open);

  function handleClose() {
    closeFilePreviewDialog();
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
    rotation = (rotation + 90) % 360;
  }

  function handleDownload() {
    if (file && file.storageKey) {
      window.open(
        `/api/files/${encodeURIComponent(file.storageKey)}?download=true`,
        "_blank"
      );
    }
  }

  function getFileUrl(file: FileItem): string | null {
    return file.storageKey
      ? `/api/files/${encodeURIComponent(file.storageKey)}`
      : null;
  }

  function isImage(mimeType: string | undefined): boolean {
    return mimeType ? mimeType.startsWith("image/") : false;
  }

  function isVideo(mimeType: string | undefined): boolean {
    return mimeType ? mimeType.startsWith("video/") : false;
  }

  function isAudio(mimeType: string | undefined): boolean {
    return mimeType ? mimeType.startsWith("audio/") : false;
  }

  function isPdf(mimeType: string | undefined): boolean {
    return mimeType === "application/pdf";
  }

  function isText(mimeType: string | undefined): boolean {
    if (!mimeType) return false;
    return (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/javascript" ||
      mimeType === "application/xml"
    );
  }

  function getFileIcon(mimeType: string | undefined) {
    if (isImage(mimeType)) return ImageIcon;
    if (isVideo(mimeType)) return VideoIcon;
    if (isAudio(mimeType)) return MusicIcon;
    if (isText(mimeType)) return FileTextIcon;
    return FileIcon;
  }

  const backgroundStyle =
    "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2";
  const separatorStyle = "w-0.5 h-6 bg-border rounded-full";
</script>

<Dialog {open} onOpenChange={handleClose}>
  <DialogContent
    class="!max-w-screen w-screen h-screen flex flex-col p-0 gap-0 rounded-none border-none bg-black/25 backdrop-blur"
    showCloseButton={false}
  >
    {#if file}
      <!-- Header with actions -->
      <div class="w-full flex items-start justify-between p-4">
        <div class="{backgroundStyle} gap-3 px-4">
          {#if file.mimeType}
            {@const Icon = getFileIcon(file.mimeType)}
            <Icon
              class="size-9 text-muted-foreground"
              absoluteStrokeWidth
              strokeWidth={1.5}
            />
          {/if}
          <span class={separatorStyle}></span>
          <div>
            <h2 class="font-medium text-lg">{file.name}</h2>
            <p class="text-sm text-muted-foreground">
              {formatFileSize(file.size || 0)} • {file.mimeType ||
                "Unknown type"}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Zoom controls for images -->
          {#if isImage(file.mimeType)}
            <div class="{backgroundStyle} !p-1">
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
              <span class={separatorStyle}></span>
              <Button variant="ghost" size="icon" onclick={handleRotate}>
                <RotateCwIcon class="size-4" />
              </Button>
            </div>
          {/if}

          <div class="{backgroundStyle} !p-1">
            <Button
              variant="ghost"
              size="sm"
              onclick={handleDownload}
              class="h-9"
            >
              <DownloadIcon class="size-4" />
              Download
            </Button>
            <span class={separatorStyle}></span>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => handleAction("delete")}
              class="text-destructive hover:text-destructive h-9"
            >
              <TrashIcon class="size-4" />
              Delete
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            class="{backgroundStyle} size-11"
            onclick={handleClose}
          >
            <XIcon class="size-4" />
          </Button>
        </div>
      </div>

      <!-- Content area -->
      <div class="flex-1 -z-1 relative">
        <div class="absolute inset-0 flex items-center justify-center">
          {#if isLoading}
            <div class="text-center">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
              ></div>
              <p class="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          {:else if error}
            <div class="text-center">
              <FileIcon class="size-12 text-muted-foreground mx-auto mb-2" />
              <p class="text-sm text-muted-foreground">{error}</p>
            </div>
          {:else if file.storageKey && isImage(file.mimeType)}
            <!-- Image preview -->
            <img
              src={getFileUrl(file)}
              alt={file.name}
              class="object-contain transition-transform duration-200"
              style="scale: {zoom}%; transform: rotate({rotation}deg);"
              onload={() => (isLoading = false)}
              onerror={() => (error = "Failed to load image")}
            />
          {:else if file.storageKey && isVideo(file.mimeType)}
            <!-- Video preview -->
            <video
              controls
              class="max-w-full max-h-full"
              onloadstart={() => (isLoading = false)}
              onerror={() => (error = "Failed to load video")}
            >
              <source src={getFileUrl(file)} type={file.mimeType} />
              <track kind="captions" />
              Your browser does not support the video element.
            </video>
          {:else if file.storageKey && isAudio(file.mimeType)}
            <!-- Audio preview -->
            <div class="text-center">
              <MusicIcon class="size-16 text-muted-foreground mx-auto mb-4" />
              <audio
                controls
                class="mx-auto"
                onloadstart={() => (isLoading = false)}
                onerror={() => (error = "Failed to load audio")}
              >
                <source src={getFileUrl(file)} type={file.mimeType} />
                Your browser does not support the audio element.
              </audio>
            </div>
          {:else if file.storageKey && isPdf(file.mimeType)}
            <!-- PDF preview -->
            <object
              data={getFileUrl(file)}
              type="application/pdf"
              class="w-full h-full"
              title={file.name}
              onload={() => (isLoading = false)}
              onerror={() => (error = "Failed to load PDF")}
            >
              <div class="text-center p-8">
                <FileIcon class="size-16 text-muted-foreground mx-auto mb-4" />
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
          {:else if file.storageKey && isText(file.mimeType)}
            <!-- Text file preview -->
            <div class="w-full h-full max-w-4xl mx-auto">
              <iframe
                src={getFileUrl(file)}
                class="w-full h-full border border-border rounded-lg bg-background"
                title={file.name}
                onload={() => (isLoading = false)}
                onerror={() => (error = "Failed to load text file")}
              ></iframe>
            </div>
          {:else}
            <!-- Unsupported file type or missing storage key -->
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
      <div class="{backgroundStyle} w-fit m-4 px-2">
        <div
          class="flex items-center gap-4 text-sm font-medium text-muted-foreground"
        >
          <span>Created: {file.createdAt.toLocaleString()}</span>
          <span class={separatorStyle}></span>
          <span>Modified: {file.updatedAt.toLocaleString()}</span>
          {#if file.ownerId}
            <span class={separatorStyle}></span>
            <span>Owner: {file.ownerId}</span>
          {/if}
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>
