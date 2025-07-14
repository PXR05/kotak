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
  import { Label } from "$lib/components/ui/label/index.js";
  import { FolderPlusIcon, LoaderIcon } from "@lucide/svelte";
  import { closeCreateFolderDialog, createFolderDialogData } from "$lib/stores";

  const open = $derived(createFolderDialogData.open);

  let folderName = $state("");
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    if (open) {
      folderName = "";
      error = null;
      isSubmitting = false;
    }
  });

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      handleCancel();
    }
  }

  function handleCancel() {
    closeCreateFolderDialog();
    folderName = "";
    error = null;
    isSubmitting = false;
  }

  function validateName(name: string): string | null {
    if (!name.trim()) {
      return "Folder name cannot be empty";
    }

    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return "Name contains invalid characters";
    }

    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(name.trim())) {
      return "This name is reserved and cannot be used";
    }

    if (name.length > 255) {
      return "Name is too long (maximum 255 characters)";
    }

    if (name !== name.trim()) {
      return "Name cannot start or end with spaces";
    }

    if (name.endsWith(".")) {
      return "Name cannot end with a dot";
    }

    return null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const trimmedName = folderName.trim();
    const validationError = validateName(trimmedName);

    if (validationError) {
      error = validationError;
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      await createFolderDialogData.callback?.(trimmedName);
      closeCreateFolderDialog();
    } catch (err) {
      isSubmitting = false;
      error =
        err instanceof Error ? err.message : "An unexpected error occurred";
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }
</script>

<Dialog {open} onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <form onsubmit={handleSubmit}>
      <DialogHeader>
        <div class="flex items-center gap-3">
          <FolderPlusIcon class="size-5 text-primary" />
          <DialogTitle>Create New Folder</DialogTitle>
        </div>
        <DialogDescription>Enter a name for the new folder</DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <div class="space-y-2">
          <Label for="folder-name-input">Folder Name</Label>
          <Input
            id="folder-name-input"
            bind:value={folderName}
            onkeydown={handleKeydown}
            disabled={isSubmitting}
            class={error ? "border-destructive" : ""}
            placeholder="Enter folder name"
            autofocus
          />
          {#if error}
            <p class="text-sm text-destructive">{error}</p>
          {/if}
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onclick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !!error || !folderName.trim()}
          class="flex items-center gap-2"
        >
          {#if isSubmitting}
            <LoaderIcon class="size-4 animate-spin" />
            Creating...
          {:else}
            Create Folder
          {/if}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
