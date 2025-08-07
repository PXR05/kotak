<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import {
    FolderIcon,
    MoveIcon,
    HomeIcon,
    SearchIcon,
    LoaderIcon,
  } from "@lucide/svelte";
  import { closeMoveDialog, moveDialogData } from "$lib/stores";
  import { getFolders } from "$lib/remote/folders.remote.js";
  import { currentFolderId } from "$lib/stores";
  import type { FileItem } from "$lib/types/file.js";

  const items = $derived(moveDialogData.items);
  const open = $derived(moveDialogData.open);

  let folders = $state<FileItem[]>([]);
  let selectedFolderId = $state<string | null>(null);
  let searchQuery = $state("");
  let isLoading = $state(false);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    if (open) {
      resetDialog();
      loadFolders();
    }
  });

  function resetDialog() {
    selectedFolderId = null;
    searchQuery = "";
    error = null;
    isSubmitting = false;
  }

  async function loadFolders() {
    isLoading = true;
    error = null;

    const { data, error: err } = await getFolders();
    if (err) {
      error = err || "Failed to load folders";
      isLoading = false;
      return;
    }
    if (!data || !Array.isArray(data)) {
      error = "Invalid folder data";
      isLoading = false;
      return;
    }
    folders = filterAvailableFolders(data, items);
    isLoading = false;
  }

  function filterAvailableFolders(
    allFolders: FileItem[],
    itemsToMove: FileItem[]
  ): FileItem[] {
    const itemIds = new Set(itemsToMove.map((item) => item.id));

    return allFolders.filter(
      (folder: FileItem) =>
        !itemIds.has(folder.id) &&
        !isDescendantOfMovingItems(folder, itemsToMove)
    );
  }

  function isDescendantOfMovingItems(
    folder: FileItem,
    movingItems: FileItem[]
  ): boolean {
    const movingFolderIds = new Set(
      movingItems
        .filter((item) => item.type === "folder")
        .map((item) => item.id)
    );

    return (
      folder.parentId !== undefined &&
      folder.parentId !== null &&
      movingFolderIds.has(folder.parentId)
    );
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      closeMoveDialog();
    }
  }

  function selectFolder(folderId: string | null) {
    selectedFolderId = folderId;
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    isSubmitting = true;
    error = null;

    try {
      await moveDialogData.callback?.(selectedFolderId);
      closeMoveDialog();
    } catch (err) {
      isSubmitting = false;
      error = err instanceof Error ? err.message : "Failed to move items";
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && selectedFolderId !== null) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMoveDialog();
    }
  }

  const isCurrentFolder = $derived(selectedFolderId === currentFolderId.value);
  const canMove = $derived(!isSubmitting && !isCurrentFolder);

  const filteredFolders = $derived.by(() => {
    if (!searchQuery.trim()) return folders;
    const query = searchQuery.toLowerCase().trim();
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(query)
    );
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if items.length > 0}
  <Dialog {open} onOpenChange={handleOpenChange}>
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <MoveIcon class="size-5 text-primary" />
          <DialogTitle>
            Move {items.length}
            {items.length === 1 ? "item" : "items"}
          </DialogTitle>
        </div>
        <DialogDescription>
          Select a destination folder for the selected items
        </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        {#if isLoading}
          <div class="flex flex-col items-center justify-center py-8 gap-2">
            <LoaderIcon class="size-4 animate-spin" />
            <div class="text-sm text-muted-foreground">Loading folders...</div>
          </div>
        {:else if error}
          <div class="text-sm text-destructive">{error}</div>
        {:else}
          <!-- Search input -->
          <div class="mb-3">
            <div class="relative">
              <SearchIcon
                class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                bind:value={searchQuery}
                placeholder="Search folders..."
                class="pl-9"
              />
            </div>
          </div>

          <ScrollArea class="h-64 w-full rounded border">
            <div class="p-2 space-y-1">
              <!-- Root folder option -->
              <button
                type="button"
                onclick={() => selectFolder(null)}
                class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-accent
                       {selectedFolderId === null ? 'bg-accent' : ''}"
              >
                <HomeIcon class="size-4 text-muted-foreground" />
                <span>Root folder</span>
              </button>

              <!-- Folder list -->
              {#each filteredFolders as folder (folder.id)}
                <button
                  type="button"
                  onclick={() => selectFolder(folder.id)}
                  class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-accent
                         {selectedFolderId === folder.id ? 'bg-accent' : ''}"
                  disabled={folder.id === currentFolderId.value}
                >
                  <FolderIcon class="size-4" />
                  <span class="truncate">{folder.name}</span>
                  {#if folder.id === currentFolderId.value}
                    <span class="text-xs text-muted-foreground">(current)</span>
                  {/if}
                </button>
              {/each}
            </div>
          </ScrollArea>
        {/if}

        {#if error}
          <p class="text-sm text-destructive mt-2">{error}</p>
        {/if}
      </div>

      <DialogFooter class="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onclick={closeMoveDialog}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onclick={handleSubmit}
          disabled={!canMove}
          class="flex items-center gap-2"
        >
          {#if isSubmitting}
            <LoaderIcon class="size-4 animate-spin" />
            Moving...
          {:else}
            Move Here
          {/if}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}
