<script lang="ts">
  import { invalidateAll, goto } from "$app/navigation";
  import FilePreviewDialog from "$lib/components/table/FilePreviewDialog.svelte";
  import FileTable from "$lib/components/table/FileTable.svelte";
  import ConfirmationDialog from "$lib/components/table/ConfirmationDialog.svelte";
  import RenameDialog from "$lib/components/table/RenameDialog.svelte";
  import CreateFolderDialog from "$lib/components/table/CreateFolderDialog.svelte";
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
  import { createFileActionHandler } from "$lib/components/table/file-actions.js";
  import type { ConfirmationConfig } from "$lib/components/table/ConfirmationDialog.svelte";
  import {
    createConfirmationDialogState,
    openConfirmationDialog,
    closeConfirmationDialog,
    createRenameDialogState,
    openRenameDialog,
    closeRenameDialog,
    createCreateFolderDialogState,
    openCreateFolderDialog,
    closeCreateFolderDialog,
    type ConfirmationDialogState,
    type RenameDialogState,
    type CreateFolderDialogState,
  } from "$lib/dialog-state.js";

  let { data } = $props();

  let items: FileItem[] = $state(data.items || []);
  let isUploading = $state(false);

  let previewFile = $state<FileItem | null>(null);
  let previewOpen = $state(false);

  let confirmationDialog = $state<ConfirmationDialogState>(
    createConfirmationDialogState()
  );
  let renameDialog = $state<RenameDialogState>(createRenameDialogState());
  let createFolderDialog = $state<CreateFolderDialogState>(
    createCreateFolderDialogState()
  );

  function handleItemClick(item: FileItem) {
    if (item.type === "folder") {
      goto(`/${item.id}`);
    } else {
      previewFile = item;
      previewOpen = true;
    }
  }

  const handleAction = createFileActionHandler({
    onItemClick: handleItemClick,
    onPreviewOpen: (item: FileItem) => {
      previewFile = item;
      previewOpen = true;
    },
    onAfterDelete: (item: FileItem) => {
      items = items.filter((i) => i.id !== item.id);
      if (previewFile && previewFile.id === item.id) {
        previewOpen = false;
        previewFile = null;
      }
    },
    onConfirm: (config: ConfirmationConfig, onConfirm: () => void) => {
      confirmationDialog = openConfirmationDialog(
        confirmationDialog,
        config,
        onConfirm
      );
    },
    onRename: (
      item: FileItem,
      onRename: (newName: string) => Promise<void>
    ) => {
      renameDialog = openRenameDialog(renameDialog, item, onRename);
    },
  });

  function handleConfirmationConfirm() {
    confirmationDialog.callback?.();
    confirmationDialog = closeConfirmationDialog(confirmationDialog);
  }

  function handleConfirmationCancel() {
    confirmationDialog = closeConfirmationDialog(confirmationDialog);
  }

  async function handleRename(newName: string) {
    try {
      await renameDialog.callback?.(newName);
      renameDialog = closeRenameDialog(renameDialog);
    } catch (error) {}
  }

  function handleRenameCancel() {
    renameDialog = closeRenameDialog(renameDialog);
  }

  async function handleCreateFolder(name: string) {
    try {
      await createFolderDialog.callback?.(name);
      createFolderDialog = closeCreateFolderDialog(createFolderDialog);
    } catch (error) {}
  }

  function handleCreateFolderCancel() {
    createFolderDialog = closeCreateFolderDialog(createFolderDialog);
  }

  function handlePreviewOpenChange(open: boolean) {
    previewOpen = open;
    if (!open) {
      previewFile = null;
    }
  }

  async function handleFilesUpload(uploadableFiles: UploadableFile[]) {
    if (isUploading) return;

    isUploading = true;

    try {
      const formData = new FormData();

      uploadableFiles.forEach((uploadFile, index) => {
        formData.append("files", uploadFile.file);

        formData.append(
          "relativePaths",
          uploadFile.relativePath || uploadFile.name
        );
      });

      if (data.currentFolderId) {
        formData.append("folderId", data.currentFolderId);
      }

      const response = await fetch("/api/storage", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.text();
        alert("Upload failed: " + error);
      }
    } catch (error) {
      alert("Error uploading files");
    } finally {
      isUploading = false;
    }
  }

  $effect(() => {
    items = data.items || [];
  });
</script>

<div class="p-4 h-[100dvh] bg-background">
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
      dialogsOpen={previewOpen || createFolderDialog.open}
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

  <ConfirmationDialog
    open={confirmationDialog.open}
    config={confirmationDialog.config}
    onConfirm={handleConfirmationConfirm}
    onCancel={handleConfirmationCancel}
  />

  <RenameDialog
    open={renameDialog.open}
    item={renameDialog.item}
    onRename={handleRename}
    onCancel={handleRenameCancel}
  />

  <CreateFolderDialog
    open={createFolderDialog.open}
    onCreateFolder={handleCreateFolder}
    onCancel={handleCreateFolderCancel}
  />
</div>
