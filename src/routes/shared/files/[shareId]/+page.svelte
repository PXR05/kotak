<script lang="ts">
  import { FilePreviewDialog } from "$lib/components/dialog/filepreview/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import { onMount } from "svelte";

  let { data } = $props();

  const sharedFile = $derived<FileItem>({
    id: data.file.id,
    name: data.file.name,
    size: data.file.size,
    mimeType: data.file.mimeType,
    createdAt: data.file.createdAt,
    updatedAt: data.file.updatedAt,
    ownerId: `Shared by ${data.sharedBy.email}`,
    folderId: data.file.folderId,
    storageKey: data.share.id,
    type: "file" as const,
  });

  let filePreviewOpen = $state(false);

  onMount(() => {
    filePreviewOpen = true;
  });

  const handleClose = () => {
    filePreviewOpen = false;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  const getSharedFileUrl = (file: FileItem): string | null =>
    file.storageKey
      ? `/api/shared/files/${encodeURIComponent(file.storageKey)}`
      : null;
</script>

<FilePreviewDialog
  open={filePreviewOpen}
  file={sharedFile}
  onClose={handleClose}
  getFileUrl={getSharedFileUrl}
  showActions={false}
/>

<noscript>
  <div class="container mx-auto max-w-4xl p-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">{data.file.name}</h1>
      <p class="text-muted-foreground mb-4">Shared by {data.sharedBy.email}</p>
      <a
        href="/api/shared/files/{data.share.id}?download=true"
        class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        Download File
      </a>
    </div>
  </div>
</noscript>
