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
  import { AlertTriangleIcon } from "@lucide/svelte";

  export interface ConfirmationConfig {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    icon?: boolean;
  }

  let {
    open = false,
    config,
    onConfirm,
    onCancel,
  }: {
    open?: boolean;
    config?: ConfirmationConfig | null;
    onConfirm?: () => void;
    onCancel?: () => void;
  } = $props();

  function handleConfirm() {
    onConfirm?.();
  }

  function handleCancel() {
    onCancel?.();
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
        <Button variant="outline" onclick={handleCancel}>
          {config.cancelText || "Cancel"}
        </Button>
        <Button variant={config.variant || "default"} onclick={handleConfirm}>
          {config.confirmText || "Confirm"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}
