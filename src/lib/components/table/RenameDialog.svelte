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
  import { EditIcon } from "@lucide/svelte";
  import type { FileItem } from "$lib/types/file.js";

  let {
    open = false,
    item = null,
    onRename,
    onCancel,
  }: {
    open?: boolean;
    item?: FileItem | null;
    onRename?: (newName: string) => Promise<void>;
    onCancel?: () => void;
  } = $props();

  let newName = $state("");
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  // Update newName when item changes or dialog opens
  $effect(() => {
    if (item && open) {
      newName = item.name;
      error = null;
      isSubmitting = false; // Reset submitting state when dialog opens
    }
  });

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      handleCancel();
    }
  }

  function handleCancel() {
    onCancel?.();
    newName = "";
    error = null;
    isSubmitting = false;
  }

  function validateName(name: string): string | null {
    if (!name.trim()) {
      return "Name cannot be empty";
    }

    if (name.trim() === item?.name) {
      return "Name must be different from current name";
    }

    // Check for invalid characters (common across most file systems)
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return "Name contains invalid characters";
    }

    // Check for reserved names on Windows
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(name.trim())) {
      return "This name is reserved and cannot be used";
    }

    if (name.length > 255) {
      return "Name is too long (maximum 255 characters)";
    }

    return null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const trimmedName = newName.trim();
    const validationError = validateName(trimmedName);

    if (validationError) {
      error = validationError;
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      await onRename?.(trimmedName);
      // Dialog will be closed by parent component on success
    } catch (err) {
      // Show error in dialog and keep it open
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

{#if item}
  <Dialog {open} onOpenChange={handleOpenChange}>
    <DialogContent class="sm:max-w-md">
      <form onsubmit={handleSubmit}>
        <DialogHeader>
          <div class="flex items-center gap-3">
            <EditIcon class="size-5 text-primary" />
            <DialogTitle>Rename {item.type}</DialogTitle>
          </div>
          <DialogDescription>
            Enter a new name for "{item.name}"
          </DialogDescription>
        </DialogHeader>

        <div class="py-4">
          <div class="space-y-2">
            <Label for="rename-input">Name</Label>
            <Input
              id="rename-input"
              bind:value={newName}
              onkeydown={handleKeydown}
              disabled={isSubmitting}
              class={error ? "border-destructive" : ""}
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
            disabled={isSubmitting || !!error || !newName.trim()}
          >
            {#if isSubmitting}
              Renaming...
            {:else}
              Rename
            {/if}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
{/if}
