<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import {
    DownloadIcon,
    FileIcon,
    FileTextIcon,
    ImageIcon,
    VideoIcon,
    MusicIcon,
    LoaderIcon,
  } from "@lucide/svelte";

  let {
    file,
    fileUrl,
    zoom,
    rotation,
    isLoading,
    error,
    onDownload,
    onMediaLoad,
    onMediaError,
  }: {
    file: FileItem;
    fileUrl: string | null;
    zoom: number;
    rotation: number;
    isLoading: boolean;
    error: string | null;
    onDownload: () => void;
    onMediaLoad: () => void;
    onMediaError: (type: string) => void;
  } = $props();

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

  const fileType = $derived(getFileType(file?.mimeType));
</script>

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
          onload={onMediaLoad}
          onerror={() => onMediaError("image")}
        />
      {:else if fileType === "video"}
        <video
          controls
          class="max-w-full max-h-full"
          onloadstart={onMediaLoad}
          onerror={() => onMediaError("video")}
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
            onloadstart={onMediaLoad}
            onerror={() => onMediaError("audio")}
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
          onload={onMediaLoad}
          onerror={() => onMediaError("PDF")}
        >
          <div class="text-center p-8">
            <FileIcon class="size-16 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">PDF Preview Unavailable</h3>
            <p class="text-sm text-muted-foreground mb-4">
              Your browser doesn't support inline PDF viewing.
            </p>
            <Button onclick={onDownload}>
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
            onload={onMediaLoad}
            onerror={() => onMediaError("text file")}
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
          <Button onclick={onDownload}>
            <DownloadIcon class="size-4 mr-2" />
            Download to view
          </Button>
        {/if}
      </div>
    {/if}
  </div>
</div>
