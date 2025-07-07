<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table/index.js";
  import { FolderIcon, FileIcon, DownloadIcon, EyeIcon } from "@lucide/svelte";
  import FilePreviewDialog from "$lib/components/dialog/FilePreviewDialog.svelte";
  import type { FileItem } from "$lib/types/file.js";

  let { data } = $props();

  let previewOpen = $state(false);
  let selectedFile = $state<FileItem | null>(null);

  const formatFileSize = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const handleItemClick = (item: any) => {
    if (item.type === "file") {
      selectedFile = {
        ...item,
        storageKey: item.id,
        type: "file" as const,
      };
      previewOpen = true;
    }
  };

  const downloadFile = (item: any) => {
    if (item.type === "file") {
      window.open(
        `/api/shared/folders/${data.share.id}/file/${item.id}?download=true`,
        "_blank"
      );
    }
  };

  const closePreview = () => {
    previewOpen = false;
    selectedFile = null;
  };

  const getSharedFileUrl = (file: FileItem): string | null =>
    file.storageKey
      ? `/api/shared/folders/${data.share.id}/file/${file.storageKey}`
      : null;
</script>

<div class="container mx-auto max-w-6xl p-6">
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-3">
        <FolderIcon class="size-6" />
        {data.folder.name}
      </CardTitle>
      <div class="text-sm text-muted-foreground">
        Shared by {data.sharedBy.email}
        {#if data.share.expiresAt}
          • Expires on {formatDate(data.share.expiresAt)}
        {/if}
      </div>
    </CardHeader>
    <CardContent>
      {#if data.items.length === 0}
        <div class="text-center py-8 text-muted-foreground">
          This folder is empty
        </div>
      {:else}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.items as item}
              <TableRow class="cursor-pointer hover:bg-muted/50">
                <TableCell class="flex items-center gap-3">
                  {#if item.type === "folder"}
                    <FolderIcon class="size-4 text-blue-500" />
                  {:else}
                    <FileIcon class="size-4 text-gray-500" />
                  {/if}
                  <span class="font-medium">{item.name}</span>
                </TableCell>
                <TableCell>
                  {#if item.type === "file" && item.size}
                    {formatFileSize(item.size)}
                  {:else}
                    —
                  {/if}
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell>
                  <div class="flex gap-2">
                    {#if item.type === "file"}
                      <Button
                        size="sm"
                        variant="ghost"
                        onclick={() => handleItemClick(item)}
                        class="p-1 h-8 w-8"
                      >
                        <EyeIcon class="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onclick={() => downloadFile(item)}
                        class="p-1 h-8 w-8"
                      >
                        <DownloadIcon class="size-4" />
                      </Button>
                    {/if}
                  </div>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </CardContent>
  </Card>
</div>

<FilePreviewDialog
  open={previewOpen}
  file={selectedFile}
  onClose={closePreview}
  getFileUrl={getSharedFileUrl}
  showActions={false}
/>
