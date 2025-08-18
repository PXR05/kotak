<script lang="ts">
  import FileTable from "$lib/components/table/file/FileTable.svelte";
  import { fileOperations } from "$lib/stores";
  import { LoaderIcon } from "@lucide/svelte";
  import {
    initAllDialogsFromUrl,
    handleAllUrlChanges,
  } from "$lib/stores/dialogs/urlStateManager.js";
  import { afterNavigate } from "$app/navigation";
  import type { FileItem } from "$lib/types/file.js";
  import UploadButton from "$lib/components/sidebar/UploadButton.svelte";
  import { getRootItems } from "$lib/remote/load.remote";
  import { getFolderChildren } from "$lib/remote/folders.remote";
  import Error from "$lib/components/shared/Error.svelte";
  import { toast } from "svelte-sonner";

  const { data } = $props();
  const { user, currentFolderId } = $derived(data);
  let currentItems: FileItem[] = $state([]);
  let isInitialLoad = $state(true);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    fileOperations.setCurrentFolder(currentFolderId);
    fileOperations.setCurrentUser(user?.id || null);
  });

  $effect(() => {
    isLoading = true;
    async function load() {
      error = null;
      const hasCurrentFolder = currentFolderId && currentFolderId.length > 0;
      const { data, error: err } = await (hasCurrentFolder
        ? getFolderChildren(currentFolderId)
        : getRootItems());
      if (err) {
        error = err;
        toast.error(err);
      } else {
        currentItems = data ?? [];
        initAllDialogsFromUrl(data ?? []);
      }
      isLoading = false;
      isInitialLoad = false;
    }
    load();
  });

  afterNavigate(() => {
    handleAllUrlChanges(currentItems);
  });
</script>

<svelte:window onpopstate={() => handleAllUrlChanges(currentItems)} />

{#if data.user}
  {#if isInitialLoad}
    <div class="text-center m-auto">
      <LoaderIcon class="animate-spin size-6 text-primary mx-auto mb-4" />
      <p class="text-muted-foreground">Loading files and folders...</p>
    </div>
  {:else if error}
    <Error messages={[error]} status={500} statusMessage={error} />
  {:else}
    <div class={isLoading ? "opacity-50 pointer-events-none" : ""}>
      <FileTable items={currentItems} currentFolderId={data.currentFolderId} />
    </div>
    <div class="fixed bottom-4 right-4 md:hidden">
      <UploadButton />
    </div>
  {/if}
{/if}
