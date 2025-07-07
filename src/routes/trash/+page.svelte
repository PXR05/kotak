<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { fileOperations } from "$lib/stores";
  import { openConfirmationDialog } from "$lib/stores/dialogs/confirmationDialog.svelte.js";
  import { Trash2Icon } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import TrashTable from "$lib/components/table/TrashTable.svelte";

  let { data } = $props();

  let trashedItems = $state(data.trashedItems);
  let isLoading = $state(false);

  const refreshTrash = async () => {
    try {
      isLoading = true;
      trashedItems = await fileOperations.getTrashedItems();
    } catch (error) {
      console.error("Failed to refresh trash:", error);
      toast.error("Failed to refresh trash");
    } finally {
      isLoading = false;
    }
  };

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
          await refreshTrash();
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

  <div class="flex-1 overflow-hidden">
    <TrashTable
      items={trashedItems}
      onRefresh={refreshTrash}
      onEmptyTrash={handleEmptyTrash}
    />
  </div>
</div>
