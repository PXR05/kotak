<script lang="ts">
  import FileTable from "$lib/components/table/FileTable.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { fileOperations } from "$lib/stores";
  import { LoaderIcon } from "@lucide/svelte";
  import {
    initAllDialogsFromUrl,
    handleAllUrlChanges,
  } from "$lib/stores/dialogs/urlStateManager.js";
  import { afterNavigate } from "$app/navigation";
  import type { FileItem } from "$lib/types/file.js";

  let { data } = $props();
  let currentItems: FileItem[] = $state([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    fileOperations.setCurrentFolder(data.currentFolderId);
    fileOperations.setCurrentUser(data.user?.id || null);
  });

  $effect(() => {
    const loadItems = async () => {
      try {
        isLoading = true;
        error = null;
        const items = await (data.currentFolderId
          ? data.items
          : data.rootItems);
        currentItems = items;
      } catch (err) {
        console.error("Failed to load items:", err);
        error = err instanceof Error ? err.message : "Failed to load items";
        currentItems = [];
      } finally {
        isLoading = false;
      }
    };

    loadItems();
  });

  $effect(() => {
    initAllDialogsFromUrl(currentItems);
  });

  afterNavigate(() => {
    handleAllUrlChanges(currentItems);
  });

  $effect(() => {
    const handlePopState = () => {
      handleAllUrlChanges(currentItems);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  });
</script>

{#if data.user}
  {#if isLoading}
    <div class="text-center m-auto">
      <LoaderIcon class="animate-spin size-8 text-primary mx-auto mb-4" />
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
    <FileTable items={currentItems} currentFolderId={data.currentFolderId} />
  {/if}
{/if}
