<script lang="ts">
  import FileTable from "$lib/components/table/FileTable.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import type { FileItem } from "$lib/types/file.js";
  import {
    fileOperations,
  } from "$lib/stores/index.js";

  let { data } = $props();

  let items: FileItem[] = $state(data.items || []);

  $effect(() => {
    fileOperations.setCurrentFolder(data.currentFolderId);
    fileOperations.setCurrentUser(data.user?.id || null);
    items = data.items || [];
  });
</script>

{#if data.user}
  <FileTable
    {items}
    currentUserId={data.user.id}
    currentFolderId={data.currentFolderId}
  />
{:else}
  <div class="flex items-center justify-center min-h-[400px]">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to LocalDrive</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground mb-4">
          Please sign in to access your files and folders.
        </p>
        <Button href="/auth/login" class="w-full">Sign In</Button>
      </CardContent>
    </Card>
  </div>
{/if}
