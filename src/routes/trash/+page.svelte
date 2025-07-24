<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { fileOperations } from "$lib/stores";
  import { openConfirmationDialog } from "$lib/stores/dialogs/confirmationDialog.svelte.js";
  import { LoaderIcon, Trash2Icon } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import TrashTable from "$lib/components/table/trash/TrashTable.svelte";
  import {
    initPreviewFromUrl,
    handleUrlChange,
  } from "$lib/stores/dialogs/filePreviewDialog.svelte.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { afterNavigate, invalidateAll } from "$app/navigation";
  import { onGetTrashedItems } from "$lib/telefunc/load.telefunc.js";
  import type { FileItem, TrashedItem } from "$lib/types/file.js";

  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let trashedItems: (FileItem & TrashedItem)[] = $state([]);

  $effect(() => {
    async function loadItems() {
      isLoading = true;
      error = null;
      const { data, error: err } = await onGetTrashedItems();
      if (err) {
        error = err;
        toast.error(err);
      } else {
        trashedItems = (data ?? []).map((item) => ({
          ...item,
          createdAt: new Date(item.trashedAt),
          updatedAt: new Date(item.trashedAt),
        }));
        initPreviewFromUrl(trashedItems);
      }
      isLoading = false;
    }

    loadItems();
  });

  afterNavigate(() => {
    handleUrlChange(trashedItems);
  });

  $effect(() => {
    const handlePopState = () => {
      handleUrlChange(trashedItems);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  });

  const handleEmptyTrash = () => {
    if (trashedItems.length === 0) {
      toast.info("Trash is already empty");
      return;
    }

    openConfirmationDialog(
      {
        title: "Empty trash",
        description: `Are you sure you want to permanently delete all ${trashedItems.length} items in trash? This action cannot be undone.`,
        confirmText: "Empty Trash",
        cancelText: "Cancel",
        variant: "destructive",
      },
      async () => {
        try {
          await fileOperations.emptyTrash();
          invalidateAll();
        } catch (error) {
          console.error("Failed to empty trash:", error);
        }
      }
    );
  };
</script>

<div class="flex flex-col h-full">
  <div class="p-4 border-b border-border">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Trash</h1>
        <p class="text-sm text-muted-foreground">
          {trashedItems.length} item{trashedItems.length === 1 ? "" : "s"} in trash
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="destructive"
          onclick={handleEmptyTrash}
          disabled={trashedItems.length === 0}
        >
          <Trash2Icon class="size-4 mr-2" />
          Empty Trash
        </Button>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="text-center m-auto">
      <LoaderIcon class="animate-spin size-6 text-primary mx-auto mb-4" />
      <p class="text-muted-foreground">Loading files and folders...</p>
    </div>
  {:else if error}
    <Card class="w-full max-w-md m-auto">
      <CardHeader>
        <CardTitle class="font-serif text-xl">Error Loading Files</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground mb-8">
          {error}
        </p>
        <Button onclick={() => window.location.reload()} class="w-full">
          Refresh Page
        </Button>
      </CardContent>
    </Card>
  {:else}
    <div class="flex-1 overflow-hidden">
      <TrashTable items={trashedItems} onEmptyTrash={handleEmptyTrash} />
    </div>
  {/if}
</div>
