<script lang="ts">
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
    Share2Icon,
  } from "@lucide/svelte";
  import { formatFileSize } from "$lib/utils/format";

  let {
    file,
    zoom,
    onClose,
    onAction,
    onZoomIn,
    onZoomOut,
    onRotate,
    onDownload,
    showActions = true,
  }: {
    file: FileItem;
    zoom: number;
    onClose: () => void;
    onAction: (action: FileAction) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRotate: () => void;
    onDownload: () => void;
    showActions?: boolean;
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

  function supportsZoom(mimeType: string | undefined): boolean {
    const fileType = getFileType(mimeType);
    return fileType ? FILE_TYPES[fileType].supportsZoom : false;
  }

  const styles = {
    background:
      "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2",
    separator: "w-0.5 h-6 bg-border rounded-full",
  } as const;
</script>

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
        {formatFileSize(file.size || 0)} • {file.mimeType || "Unknown type"}
      </p>
    </div>
  </div>

  <div class="flex items-center gap-2">
    {#if supportsZoom(file.mimeType)}
      <div class="{styles.background} !p-1">
        <Button
          variant="ghost"
          size="icon"
          onclick={onZoomOut}
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
          onclick={onZoomIn}
          disabled={zoom >= 300}
        >
          <ZoomInIcon class="size-4" />
        </Button>
        <span class={styles.separator}></span>
        <Button variant="ghost" size="icon" onclick={onRotate}>
          <RotateCwIcon class="size-4" />
        </Button>
      </div>
    {/if}

    <div class="{styles.background} !p-1">
      <Button variant="ghost" size="sm" onclick={onDownload} class="h-9">
        <DownloadIcon class="size-4" />
        Download
      </Button>
      {#if showActions}
        <span class={styles.separator}></span>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onAction("share")}
          class="h-9"
        >
          <Share2Icon class="size-4" />
          Share
        </Button>
        <span class={styles.separator}></span>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onAction("trash")}
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
      onclick={onClose}
    >
      <XIcon class="size-4" />
    </Button>
  </div>
</div>
