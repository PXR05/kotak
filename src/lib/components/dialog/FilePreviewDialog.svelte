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

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function getFileIcon(mimeType: string | undefined) {
    if (isImage(mimeType)) return ImageIcon;
    if (isVideo(mimeType)) return VideoIcon;
    if (isAudio(mimeType)) return MusicIcon;
    if (isText(mimeType)) return FileTextIcon;
    return FileIcon;
  }
</script>

<Dialog {open} onOpenChange={handleClose}>
  <DialogContent
    class="!max-w-screen w-screen h-screen flex flex-col p-0 gap-0 rounded-none border-none"
    showCloseButton={false}
  >
    {#if file}
      <!-- Header with actions -->
      <div
        class="w-full flex items-center justify-between bg-background/75 border-b backdrop-blur px-6 py-4 h-16"
      >
        <div class="flex items-center gap-3">
          {#if file.mimeType}
            {@const Icon = getFileIcon(file.mimeType)}
            <Icon class="size-5 text-muted-foreground" />
          {/if}
          <div>
            <h2 class="font-semibold text-lg">{file.name}</h2>
            <p class="text-sm text-muted-foreground">
              {formatFileSize(file.size || 0)} • {file.mimeType ||
                "Unknown type"}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Zoom controls for images -->
          {#if isImage(file.mimeType)}
            <Button
              variant="ghost"
              size="sm"
              onclick={handleZoomOut}
              disabled={zoom <= 25}
            >
              <ZoomOutIcon class="size-4" />
            </Button>
            <span class="text-sm text-muted-foreground w-12 text-center"
              >{zoom}%</span
            >
            <Button
              variant="ghost"
              size="sm"
              onclick={handleZoomIn}
              disabled={zoom >= 300}
            >
              <ZoomInIcon class="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onclick={handleRotate}>
              <RotateCwIcon class="size-4" />
            </Button>
          {/if}

          <Button variant="ghost" size="sm" onclick={handleDownload}>
            <DownloadIcon class="size-4" />
            Download
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onclick={() => handleAction("delete")}
            class="text-destructive hover:text-destructive"
          >
            <TrashIcon class="size-4" />
            Delete
          </Button>

          <Button variant="ghost" size="sm" onclick={handleClose}>
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
              class="object-contain w-full h-full transition-transform duration-200"
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
      <div
        class="bg-background/75 border-t backdrop-blur px-6 py-3 h-14 flex items-center justify-center"
      >
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Created: {file.createdAt.toLocaleString()}</span>
          <span>•</span>
          <span>Modified: {file.updatedAt.toLocaleString()}</span>
          {#if file.ownerId}
            <span>•</span>
            <span>Owner: {file.ownerId}</span>
          {/if}
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>
