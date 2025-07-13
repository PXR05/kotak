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

  import {
    Share2Icon,
    XIcon,
    PlusIcon,
    LoaderIcon,
    ChevronRightIcon,
    CopyIcon,
    CheckIcon,
  } from "@lucide/svelte";
  import {
    closeShareDialog,
    shareDialogData,
    type ShareData,
  } from "$lib/stores";
  import { slide } from "svelte/transition";
  import { page } from "$app/state";
  import {
    onDeleteFileShare,
    onDeleteFolderShare,
  } from "$lib/telefunc/sharing.telefunc.js";

  const open = $derived(shareDialogData.open);
  const item = $derived(shareDialogData.item);
  const loading = $derived(shareDialogData.loading);
  const existingShareId = $derived(shareDialogData.existingShareId);
  const existingShareLink = $derived(shareDialogData.existingShareLink);

  let sharingEnabled = $state(false);
  let emails = $state<string[]>([]);
  let emailInput = $state("");
  let expiresAt = $state<Date | null>(null);
  let expirationInput = $state("");
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);
  let isCollapsibleOpen = $state(false);
  let shareLink = $state<string | null>(null);
  let copySuccess = $state(false);

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
      isCollapsibleOpen = false;
      shareLink = existingShareLink;
      copySuccess = false;
    }
  });

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      handleCancel();
    }
  }

  function handleCancel() {
    closeShareDialog();
    resetState();
  }

  function resetState() {
    sharingEnabled = false;
    emails = [];
    emailInput = "";
    expiresAt = null;
    expirationInput = "";
    error = null;
    isSubmitting = false;
    isCollapsibleOpen = false;
    shareLink = null;
    copySuccess = false;
  }

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  function handleExpirationChange() {
    expiresAt = expirationInput ? new Date(expirationInput) : null;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addEmail();
    }
  }

  async function copyShareLink() {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function handleSubmit() {
    if (!item || !shareDialogData.callback) return;

    error = null;

    if (!sharingEnabled && existingShareId) {
      return await deleteShare();
    }

    if (!sharingEnabled) {
      error = "Please enable sharing first";
      return;
    }

    await createOrUpdateShare();
  }

  async function deleteShare() {
    if (!item) return;
    isSubmitting = true;
    try {
      const { error: err } = await (item.type === "file"
        ? onDeleteFileShare({
            itemId: item.id,
          })
        : onDeleteFolderShare({
            itemId: item.id,
          }));
      if (err) {
        throw new Error(err);
      }
      shareLink = null;
      shareDialogData.existingShareId = null;
      shareDialogData.existingShareLink = null;
      shareDialogData.isPublic = false;
      shareDialogData.emails = [];
      shareDialogData.expiresAt = null;
      isCollapsibleOpen = false;
      error = null;
    } catch (err) {
      console.error("Failed to delete share:", err);
      error = err instanceof Error ? err.message : "Failed to delete share";
    } finally {
      isSubmitting = false;
    }
  }

  async function createOrUpdateShare() {
    isSubmitting = true;
    try {
      const isPublic = emails.length === 0;
      const shareData: ShareData = {
        isPublic,
        emails: isPublic ? [] : emails,
        expiresAt,
      };

      const result = await shareDialogData.callback!(shareData);

      isCollapsibleOpen = false;
      shareLink = `${page.url.origin}/shared/${item?.type === "folder" ? "folders" : "files"}/${result.shareId}`;

      if (result.shareId) {
        shareDialogData.existingShareId = result.shareId;
        shareDialogData.existingShareLink = shareLink;
        shareDialogData.isPublic = isPublic;
        shareDialogData.emails = emails;
        shareDialogData.expiresAt = expiresAt;
      }

      error = null;
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
          {existingShareId ? "Update sharing settings for" : "Share"} "{item.name}".
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
      <div>
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

        {#if shareLink && sharingEnabled}
          <div class="space-y-2 pt-4">
            <Label>Share Link</Label>
            <div class="flex gap-2">
              <Input
                value={shareLink}
                readonly
                class="font-mono text-sm"
                placeholder="Share link will appear here..."
              />
              <Button
                onclick={copyShareLink}
                size="icon"
                variant="outline"
                class="shrink-0"
              >
                {#if copySuccess}
                  <CheckIcon class="size-4" />
                {:else}
                  <CopyIcon class="size-4" />
                {/if}
              </Button>
            </div>
            {#if copySuccess}
              <p
                transition:slide={{ duration: 150 }}
                class="text-sm text-muted-foreground"
              >
                Link copied to clipboard!
              </p>
            {/if}
          </div>
        {/if}

        {#if sharingEnabled}
          <div transition:slide={{ duration: 150 }}>
            <div>
              <Button
                onclick={() => (isCollapsibleOpen = !isCollapsibleOpen)}
                variant="link"
                class="w-full justify-start !px-0 py-7"
              >
                <ChevronRightIcon
                  class="size-4 transition-transform duration-150 {isCollapsibleOpen
                    ? 'rotate-90'
                    : ''}"
                />
                Share Settings
              </Button>

              {#if isCollapsibleOpen}
                <div transition:slide={{ duration: 150 }} class="space-y-4">
                  <!-- Email Recipients -->
                  <div class="space-y-2">
                    <Label for="email-input"
                      >Share with specific people (optional)</Label
                    >
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
                        size="icon"
                        variant="outline"
                        disabled={!emailInput.trim()}
                      >
                        <PlusIcon class="size-4" />
                      </Button>
                    </div>

                    {#if emails.length > 0}
                      <div class="flex flex-wrap gap-2 mt-2">
                        {#each emails as email}
                          <Badge
                            variant="secondary"
                            class="flex items-center gap-1"
                          >
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
                  </div>
                </div>
              {/if}
            </div>
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
      <Button onclick={handleSubmit} disabled={isSubmitting || loading}>
        {#if isSubmitting}
          <LoaderIcon class="animate-spin size-4" />
        {/if}
        {!sharingEnabled && existingShareId
          ? "Remove Share"
          : existingShareId
            ? "Update"
            : "Share"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
