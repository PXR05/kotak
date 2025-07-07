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
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Share2Icon, XIcon, PlusIcon, LoaderIcon } from "@lucide/svelte";
  import {
    closeShareDialog,
    shareDialogData,
    type ShareData,
  } from "$lib/stores";

  const open = $derived(shareDialogData.open);
  const item = $derived(shareDialogData.item);
  const loading = $derived(shareDialogData.loading);
  const existingShareId = $derived(shareDialogData.existingShareId);

  let sharingEnabled = $state(false);
  let emails = $state<string[]>([]);
  let emailInput = $state("");
  let expiresAt = $state<Date | null>(null);
  let expirationInput = $state("");
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    if (open && !loading) {
      sharingEnabled =
        shareDialogData.isPublic || shareDialogData.emails.length > 0;
      emails = [...shareDialogData.emails];
      emailInput = "";
      expiresAt = shareDialogData.expiresAt;
      expirationInput = expiresAt ? expiresAt.toISOString().split("T")[0] : "";
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
    closeShareDialog();
    sharingEnabled = false;
    emails = [];
    emailInput = "";
    expiresAt = null;
    expirationInput = "";
    error = null;
    isSubmitting = false;
  }

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    if (!isValidEmail(email)) {
      error = "Please enter a valid email address";
      return;
    }

    if (emails.includes(email)) {
      error = "This email has already been added";
      return;
    }

    emails = [...emails, email];
    emailInput = "";
    error = null;
  }

  function removeEmail(emailToRemove: string) {
    emails = emails.filter((email) => email !== emailToRemove);
  }

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleExpirationChange() {
    if (expirationInput) {
      expiresAt = new Date(expirationInput);
    } else {
      expiresAt = null;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addEmail();
    }
  }

  async function handleSubmit() {
    if (!item || !shareDialogData.callback) return;

    error = null;

    if (!sharingEnabled) {
      error = "Please enable sharing first";
      return;
    }

    isSubmitting = true;

    try {
      const isPublic = emails.length === 0;
      const shareData: ShareData = {
        isPublic,
        emails: isPublic ? [] : emails,
        expiresAt,
      };

      await shareDialogData.callback(shareData);
      handleCancel();
    } catch (err) {
      console.error("Failed to share:", err);
      error = err instanceof Error ? err.message : "Failed to share item";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog {open} onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <Share2Icon class="size-5" />
        {existingShareId ? "Edit sharing" : "Share"}
        {item?.type || "item"}
      </DialogTitle>
      <DialogDescription>
        {#if item}
          {existingShareId ? "Update sharing settings for" : "Share"} "{item.name}"
          with others by email or create a public link.
        {/if}
      </DialogDescription>
    </DialogHeader>

    {#if loading}
      <div class="space-y-4">
        <div class="grid place-items-center gap-2 py-4">
          <LoaderIcon class="animate-spin size-6" />
          <p class="text-sm text-muted-foreground">
            Loading sharing settings...
          </p>
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        <!-- Enable Sharing Toggle -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Enable Sharing</Label>
            <p class="text-sm text-muted-foreground">
              Allow others to access this {item?.type}
            </p>
          </div>
          <Switch bind:checked={sharingEnabled} />
        </div>

        {#if sharingEnabled}
          <!-- Email Recipients -->
          <div class="space-y-2">
            <Label for="email-input">Share with specific people</Label>
            <div class="flex gap-2">
              <Input
                id="email-input"
                bind:value={emailInput}
                onkeydown={handleKeyDown}
                placeholder="Enter email address"
                type="email"
              />
              <Button
                onclick={addEmail}
                size="sm"
                variant="outline"
                disabled={!emailInput.trim()}
              >
                <PlusIcon class="size-4" />
              </Button>
            </div>

            {#if emails.length > 0}
              <div class="flex flex-wrap gap-2 mt-2">
                {#each emails as email}
                  <Badge variant="secondary" class="flex items-center gap-1">
                    {email}
                    <Button
                      onclick={() => removeEmail(email)}
                      size="sm"
                      variant="ghost"
                      class="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <XIcon class="size-3" />
                    </Button>
                  </Badge>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">
                Leave empty to create a public link
              </p>
            {/if}
          </div>

          <!-- Expiration Date -->
          <div class="space-y-2">
            <Label for="expiration">Expiration date (optional)</Label>
            <Input
              id="expiration"
              bind:value={expirationInput}
              onchange={handleExpirationChange}
              type="date"
              min={new Date().toISOString().split("T")[0]}
            />
            <p class="text-sm text-muted-foreground">
              Leave empty for no expiration
            </p>
          </div>
        {/if}

        {#if error}
          <div class="text-sm text-destructive">{error}</div>
        {/if}
      </div>
    {/if}

    <DialogFooter>
      <Button
        onclick={handleCancel}
        variant="outline"
        disabled={isSubmitting || loading}
      >
        Cancel
      </Button>
      <Button
        onclick={handleSubmit}
        disabled={isSubmitting || !sharingEnabled || loading}
      >
        {#if isSubmitting}
          <LoaderIcon class="animate-spin size-4" />
        {/if}
        {existingShareId ? "Update" : "Share"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
