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
  import { AlertTriangleIcon, LoaderIcon } from "@lucide/svelte";
  import { closeConfirmationDialog, confirmationDialogData } from "$lib/stores";

  const config = $derived(confirmationDialogData.config);
  const open = $derived(confirmationDialogData.open);

  let loading = $state(false);

  async function handleConfirm() {
    if (loading) return;
    loading = true;
    await confirmationDialogData.callback?.();
    loading = false;
    closeConfirmationDialog();
  }

  function handleCancel() {
    closeConfirmationDialog();
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      handleCancel();
    }
  }
</script>

{#if config}
  <Dialog {open} onOpenChange={handleOpenChange}>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="flex items-center gap-3">
          {#if config.icon}
            <AlertTriangleIcon
              class="size-5 {config.variant === 'destructive'
                ? 'text-destructive'
                : 'text-warning'}"
            />
          {/if}
          <DialogTitle>{config.title}</DialogTitle>
        </div>
        <DialogDescription class="text-left">
          {config.description}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2 sm:gap-2">
        <Button variant="outline" onclick={handleCancel} disabled={loading}>
          {config.cancelText || "Cancel"}
        </Button>
        <Button
          variant={config.variant || "default"}
          onclick={handleConfirm}
          disabled={loading}
          class="flex items-center gap-2"
        >
          {#if loading}
            <LoaderIcon class="size-4 animate-spin" />
          {/if}
          {config.confirmText || "Confirm"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}
