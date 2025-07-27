<script lang="ts">
  import type { FileItem } from "$lib/types/file.js";
  import {
    FolderIcon,
    FileIcon,
    FileTextIcon,
    ImageIcon,
    FileVideoIcon,
    FileAudioIcon,
    ArchiveIcon,
  } from "@lucide/svelte";

  let {
    item,
  }: {
    item: FileItem;
    onItemClick?: (item: FileItem) => void;
  } = $props();

  function getIconFromMimeType(mimeType: string) {
    if (mimeType.startsWith("image/")) return ImageIcon;
    if (mimeType.startsWith("video/")) return FileVideoIcon;
    if (mimeType.startsWith("audio/")) return FileAudioIcon;
    if (
      mimeType === "application/zip" ||
      mimeType === "application/x-rar-compressed"
    )
      return ArchiveIcon;
    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/pdf" ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    ) {
      return FileTextIcon;
    }
    return FileIcon;
  }

  function getIcon(item: FileItem) {
    if (item.type === "folder") return FolderIcon;
    if (!item.mimeType) return FileIcon;
    return getIconFromMimeType(item.mimeType);
  }

  const IconComponent = $derived(getIcon(item));
</script>

<div class="flex items-center gap-3 font-medium">
  <IconComponent
    class="size-5 text-muted-foreground"
    absoluteStrokeWidth
    strokeWidth={1.5}
  />
  <span
    class="max-w-[calc(100dvw-8.5rem)] md:max-w-[calc(100dvw-42rem)] truncate"
    >{item.name}</span
  >
</div>
