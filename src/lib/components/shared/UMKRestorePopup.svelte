<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { KeyRoundIcon, TriangleAlertIcon } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { page } from "$app/state";
  import UMKRestoreDialog from "./UMKRestoreDialog.svelte";

  let showDialog = $state(false);

  const needsUMKRestore = $derived(page.data.user && !page.data.umk);

  function openDialog() {
    showDialog = true;
  }
</script>

{#if needsUMKRestore}
  <div
    class="mt-2 overflow-hidden rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-sm p-2"
    transition:slide={{ axis: "y", duration: 150 }}
  >
    <div class="flex items-center px-1 gap-2">
      <TriangleAlertIcon class="size-4 text-amber-600 dark:text-amber-400" />
      <span class="font-medium text-amber-800 dark:text-amber-200">
        Authentication Required
      </span>
    </div>
    <div class="p-1 pb-2 text-xs text-amber-700 dark:text-amber-300">
      Please enter your password to access encrypted files.
    </div>
    <Button
      size="sm"
      class="text-xs gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:hover:bg-amber-800/50 dark:text-amber-200 dark:border-amber-700 w-full"
      variant="outline"
      onclick={openDialog}
    >
      <KeyRoundIcon class="size-3" />
      Unlock
    </Button>
  </div>
{/if}

<UMKRestoreDialog bind:open={showDialog} />
