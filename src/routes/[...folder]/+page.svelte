<script lang="ts">
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
  import type { FileItem } from "$lib/types/file.js";

  // Import new state management
  import {
    fileOperations,
    isUploading,
    confirmationDialogData,
    renameDialogData,
    createFolderDialogData,
    filePreviewDialogData,
    closeConfirmationDialog,
    closeRenameDialog,
    closeCreateFolderDialog,
    closeFilePreviewDialog,
  } from "$lib/stores/index.js";

  let { data } = $props();

  let items: FileItem[] = $state(data.items || []);

  // Initialize current folder and user in global state
  $effect(() => {
    fileOperations.setCurrentFolder(data.currentFolderId);
    fileOperations.setCurrentUser(data.user?.id || null);
    items = data.items || [];
  });

  function handleConfirmationConfirm() {
    confirmationDialogData.callback?.();
    closeConfirmationDialog();
  }

  function handleConfirmationCancel() {
    closeConfirmationDialog();
  }

  async function handleRename(newName: string) {
    try {
      await renameDialogData.callback?.(newName);
      closeRenameDialog();
    } catch (error) {
      // Error handling could be improved
    }
  }

  function handleRenameCancel() {
    closeRenameDialog();
  }

  async function handleCreateFolder(name: string) {
    try {
      await createFolderDialogData.callback?.(name);
      closeCreateFolderDialog();
    } catch (error) {
      // Error handling could be improved
    }
  }

  function handleCreateFolderCancel() {
    closeCreateFolderDialog();
  }

  function handlePreviewOpenChange(open: boolean) {
    if (!open) {
      closeFilePreviewDialog();
    }
  }
</script>

{#if data.user}
  <FileTable
    {items}
    currentUserId={data.user.id}
    currentFolderId={data.currentFolderId}
    onItemClick={fileOperations.handleItemClick}
    onAction={fileOperations.handleAction}
    onFilesUpload={fileOperations.handleFilesUpload}
    dialogsOpen={filePreviewDialogData.open || createFolderDialogData.open}
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
  file={filePreviewDialogData.file}
  open={filePreviewDialogData.open}
  onOpenChange={handlePreviewOpenChange}
  onAction={fileOperations.handleAction}
/>

<ConfirmationDialog
  open={confirmationDialogData.open}
  config={confirmationDialogData.config}
  onConfirm={handleConfirmationConfirm}
  onCancel={handleConfirmationCancel}
/>

<RenameDialog
  open={renameDialogData.open}
  item={renameDialogData.item}
  onRename={handleRename}
  onCancel={handleRenameCancel}
/>

<CreateFolderDialog
  open={createFolderDialogData.open}
  onCreateFolder={handleCreateFolder}
  onCancel={handleCreateFolderCancel}
/>
