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

  let { data } = $props();

  $effect(() => {
    fileOperations.setCurrentFolder(data.currentFolderId);
    fileOperations.setCurrentUser(data.user?.id || null);
  });
</script>

{#if data.user}
  {#await data.currentFolderId ? data.items : data.rootItems}
    <div class="text-center m-auto">
      <LoaderIcon class="animate-spin size-8 text-primary mx-auto mb-4" />
      <p class="text-muted-foreground">Loading files and folders...</p>
    </div>
  {:then items}
    <FileTable {items} currentFolderId={data.currentFolderId} />
  {:catch}
    <Card class="w-full max-w-md m-auto">
      <CardHeader>
        <CardTitle class="font-serif text-xl"
          >Error Loading Files</CardTitle
        >
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground mb-8">
          Failed to load files and folders. Please try refreshing the page.
        </p>
        <Button onclick={() => window.location.reload()} class="w-full">
          Refresh Page
        </Button>
      </CardContent>
    </Card>
  {/await}
{/if}
