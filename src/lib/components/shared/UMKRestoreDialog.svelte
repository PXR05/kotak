<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    KeyRoundIcon,
    LoaderIcon,
    EyeIcon,
    EyeOffIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";
  import { restoreUMK } from "$lib/remote/crypto.remote";

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  let password = $state("");
  let showPassword = $state(false);
  let isLoading = $state(false);

  async function handleSubmitInternal() {
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    isLoading = true;

    try {
      const result = await restoreUMK({ password });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(result.data?.message || "Access restored successfully!");
      open = false;
      password = "";
      await invalidateAll();
    } catch (error) {
      console.error("UMK restore error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to restore access"
      );
    } finally {
      isLoading = false;
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    await handleSubmitInternal();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !isLoading) {
      event.preventDefault();
      handleSubmitInternal();
    }
  }

  $effect(() => {
    if (!open) {
      password = "";
      showPassword = false;
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <KeyRoundIcon class="size-5" />
        Restore File Access
      </Dialog.Title>
      <Dialog.Description>
        Please enter your password to restore access to your encrypted files.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="restore-password">Password</Label>
        <div class="relative">
          <Input
            id="restore-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            bind:value={password}
            onkeydown={handleKeydown}
            disabled={isLoading}
            class="pr-10"
            autocomplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onclick={() => (showPassword = !showPassword)}
            disabled={isLoading}
          >
            {#if showPassword}
              <EyeOffIcon class="size-4" />
            {:else}
              <EyeIcon class="size-4" />
            {/if}
          </Button>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onclick={() => (open = false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !password.trim()}
          class="gap-2"
        >
          {#if isLoading}
            <LoaderIcon class="size-4 animate-spin" />
          {:else}
            <KeyRoundIcon class="size-4" />
          {/if}
          Restore Access
        </Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
