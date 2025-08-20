<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog/index.js";
  import { formatDate, formatFileSize } from "$lib/utils/format";
  import {
    CalendarIcon,
    HashIcon,
    InfoIcon,
    FileIcon,
    HardDriveIcon,
    LockIcon,
    LockOpenIcon,
    ShieldIcon,
  } from "@lucide/svelte";
  import { closeInfoDialog, infoDialogData } from "$lib/stores";

  const open = $derived(infoDialogData.open);
  const file = $derived(infoDialogData.file);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      closeInfoDialog();
    }
  }
</script>

<Dialog {open} onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader class="pb-4">
      <DialogTitle class="flex items-center gap-2">
        <InfoIcon class="size-5 text-primary" />
        File Information
      </DialogTitle>
    </DialogHeader>

    {#if file}
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2 pb-2 border-b border-border/50">
            <FileIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-semibold text-foreground"
              >File Details</span
            >
          </div>

          <div class="grid gap-3">
            <div class="grid grid-cols-[80px_1fr] gap-3 items-start">
              <span class="text-xs text-muted-foreground font-medium">Name</span
              >
              <span class="text-sm font-medium break-all">{file.name}</span>
            </div>

            {#if file.size !== undefined}
              <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span class="text-xs text-muted-foreground font-medium"
                  >Size</span
                >
                <div class="flex items-center gap-2">
                  <HardDriveIcon class="size-3 text-muted-foreground" />
                  <span class="text-sm">{formatFileSize(file.size)}</span>
                </div>
              </div>
            {/if}

            {#if file.mimeType}
              <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span class="text-xs text-muted-foreground font-medium"
                  >Type</span
                >
                <span
                  class="bg-muted px-2 py-1 rounded text-xs font-mono w-fit"
                >
                  {file.mimeType}
                </span>
              </div>
            {/if}

            {#if file.type === "file"}
              <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span class="text-xs text-muted-foreground font-medium"
                  >Security</span
                >
                <div class="flex items-center gap-2">
                  {#if file.isEncrypted}
                    <LockIcon class="size-3 text-muted-foreground" />
                    <span class="text-sm font-medium">Encrypted</span>
                  {:else}
                    <LockOpenIcon class="size-3 text-muted-foreground" />
                    <span class="text-sm font-medium">Unencrypted</span>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2 pb-2 border-b border-border/50">
            <HashIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-semibold text-foreground"
              >System Information</span
            >
          </div>

          <div class="grid gap-3">
            <div class="grid grid-cols-[80px_1fr] gap-3 items-start">
              <span class="text-xs text-muted-foreground font-medium">ID</span>
              <span
                class="text-xs font-mono break-all bg-muted px-2 py-1 rounded"
              >
                {file.id}
              </span>
            </div>

            <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span class="text-xs text-muted-foreground font-medium"
                >Owner</span
              >
              <span
                class="text-xs font-mono break-all bg-muted px-2 py-1 rounded"
                >{file.ownerId}</span
              >
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2 pb-2 border-b border-border/50">
            <CalendarIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-semibold text-foreground">Timeline</span>
          </div>

          <div class="grid gap-3">
            <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span class="text-xs text-muted-foreground font-medium"
                >Created</span
              >
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-sm">{formatDate(file.createdAt)}</span>
              </div>
            </div>

            <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span class="text-xs text-muted-foreground font-medium"
                >Modified</span
              >
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-sm">{formatDate(file.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>
