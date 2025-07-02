<script lang="ts">
  import { invalidateAll, goto } from "$app/navigation";
  import FilePreviewDialog from "$lib/components/table/FilePreviewDialog.svelte";
  import FileTable from "$lib/components/table/FileTable.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import type {
    FileAction,
    FileItem,
    UploadableFile,
  } from "$lib/types/file.js";

  let { data } = $props();

  let items: FileItem[] = $state(data.items || []);
  let isUploading = $state(false);

  let previewFile = $state<FileItem | null>(null);
  let previewOpen = $state(false);

  function handleItemClick(item: FileItem) {
    if (item.type === "folder") {
      console.log("Opening folder:", item.name);
      // Navigate to the folder
      goto(`/${item.id}`);
    } else {
      previewFile = item;
      previewOpen = true;
    }
  }

  async function handleAction(action: FileAction, item: FileItem) {
    console.log("Action:", action, "on item:", item.name);

    switch (action) {
      case "open":
        handleItemClick(item);
        break;
      case "download":
        if (item.type === "file" && item.storageKey) {
          window.open(
            `/api/storage?key=${item.storageKey}&download=true`,
            "_blank"
          );
        }
        break;
      case "rename":
        console.log("Renaming:", item.name);
        // TODO: Implement rename functionality
        break;
      case "delete":
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          try {
            if (item.type === "file" && item.storageKey) {
              const response = await fetch(
                `/api/storage?key=${item.storageKey}`,
                {
                  method: "DELETE",
                }
              );

              if (response.ok) {
                items = items.filter((i) => i.id !== item.id);
                await invalidateAll();
                if (previewFile && previewFile.id === item.id) {
                  previewOpen = false;
                  previewFile = null;
                }
              } else {
                console.error("Failed to delete file");
                alert("Failed to delete file");
              }
            } else {
              // TODO: Implement folder deletion
              console.log("Folder deletion not implemented yet");
            }
          } catch (error) {
            console.error("Error deleting file:", error);
            alert("Error deleting file");
          }
        }
        break;
    }
  }

  function handlePreviewOpenChange(open: boolean) {
    previewOpen = open;
    if (!open) {
      previewFile = null;
    }
  }

  async function handleFilesUpload(uploadableFiles: UploadableFile[]) {
    if (isUploading) return;

    console.log("Files to upload:", uploadableFiles);
    isUploading = true;

    try {
      const formData = new FormData();

      uploadableFiles.forEach((uploadFile, index) => {
        formData.append("files", uploadFile.file);
        // Add relative path for folder structure preservation
        formData.append(
          "relativePaths",
          uploadFile.relativePath || uploadFile.name
        );
      });

      // Add current folder ID if we're in a specific folder
      if (data.currentFolderId) {
        formData.append("folderId", data.currentFolderId);
      }

      console.log(
        `Uploading ${uploadableFiles.length} files with folder structure`
      );

      // Log files with relative paths for debugging
      uploadableFiles.forEach((file, i) => {
        if (file.relativePath && file.relativePath !== file.name) {
          console.log(`  ${file.name} -> ${file.relativePath}`);
        }
      });

      const response = await fetch("/api/storage", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);

        // Force a complete reload to show new folder structure
        await invalidateAll();

        // The page will re-render with the updated data from the server
        // No need to manually update items since we're reloading everything
      } else {
        const error = await response.text();
        console.error("Upload failed:", error);
        alert("Upload failed: " + error);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Error uploading files");
    } finally {
      isUploading = false;
    }
  }

  function handleUploadClick() {
    if (isUploading) return;

    // Create a file input element and trigger it
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const uploadableFiles: UploadableFile[] = Array.from(files).map(
          (file) => ({
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
          })
        );
        handleFilesUpload(uploadableFiles);
      }
    };
    input.click();
  }

  $effect(() => {
    items = data.items || [];
  });
</script>

<div class="p-8 h-[100dvh]">
  {#if data.user}
    <FileTable
      {items}
      currentUserId={data.user.id}
      currentFolderId={data.currentFolderId}
      breadcrumbs={data.breadcrumbs || []}
      onItemClick={handleItemClick}
      onAction={handleAction}
      onFilesUpload={handleFilesUpload}
      uploadDisabled={isUploading}
    />
  {:else}
    <div class="flex items-center justify-center min-h-[400px]">
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to LocalDrive</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground mb-4">
            Please sign in to access your files and folders.
          </p>
          <Button href="/auth/login" class="w-full">Sign In</Button>
        </CardContent>
      </Card>
    </div>
  {/if}

  <FilePreviewDialog
    file={previewFile}
    open={previewOpen}
    onOpenChange={handlePreviewOpenChange}
    onAction={handleAction}
  />
</div>
