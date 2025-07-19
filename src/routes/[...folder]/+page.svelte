<script lang="ts">
  import FileTable from "$lib/components/table/file/FileTable.svelte";
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
  import UploadButton from "$lib/components/sidebar/UploadButton.svelte";
  import { onGetCurrentFolderItems } from "$lib/telefunc/load.telefunc";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";

  const { data } = $props();
  const { timestamp, user, currentFolderId } = $derived(data);
  let currentItems: FileItem[] = $state([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    fileOperations.setCurrentFolder(currentFolderId);
    fileOperations.setCurrentUser(user?.id || null);
  });

  $effect(() => {
    async function loadItems() {
      if (!timestamp) return;
      isLoading = true;
      error = null;
      if (currentFolderId && currentFolderId.length > 0) {
        const { data, error } = await onGetCurrentFolderItems(currentFolderId);
        if (error) {
          toast.error(error);
        } else {
          currentItems = data ?? [];
          initAllDialogsFromUrl(data ?? []);
        }
      } else {
        const rootItems = await page.data.rootItems;
        currentItems = rootItems;
        initAllDialogsFromUrl(rootItems);
      }
      isLoading = false;
    }

    loadItems();
  });

  afterNavigate(() => {
    handleAllUrlChanges(currentItems);
  });
</script>

<svelte:window onpopstate={() => handleAllUrlChanges(currentItems)} />

{#if data.user}
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
    <FileTable items={currentItems} currentFolderId={data.currentFolderId} />
    <div class="fixed bottom-4 right-4 md:hidden">
      <UploadButton />
    </div>
  {/if}
{/if}
