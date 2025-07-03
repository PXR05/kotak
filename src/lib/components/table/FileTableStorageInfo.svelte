<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu/index.js";
  import {
    UploadIcon,
    FolderPlusIcon,
    PlusIcon,
    HomeIcon,
    ArrowLeftIcon,
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";

  interface Breadcrumb {
    id: string;
    name: string;
  }

  let {
    breadcrumbs = [],
    uploadDisabled = false,
    onUploadClick,
    onFolderUploadClick,
  }: {
    breadcrumbs?: Breadcrumb[];
    uploadDisabled?: boolean;
    onUploadClick?: () => void;
    onFolderUploadClick?: () => void;
  } = $props();

  function navigateToFolder(folderId: string) {
    goto(`/${folderId}`);
  }

  function navigateToRoot() {
    goto("/");
  }

  function navigateBack() {
    if (breadcrumbs.length > 1) {
      navigateToFolder(breadcrumbs[breadcrumbs.length - 2].id);
    } else {
      navigateToRoot();
    }
  }
</script>

<div class="flex items-center justify-between p-4 border-b">
  <div class="flex items-center space-x-2">
    {#if breadcrumbs.length > 0}
      <Button variant="ghost" size="sm" onclick={navigateBack} title="Go back">
        <ArrowLeftIcon class="size-4" />
      </Button>

      <div class="w-px h-4 bg-border"></div>
    {/if}

    <Button variant="ghost" size="sm" onclick={navigateToRoot}>
      <HomeIcon class="size-4" />
    </Button>

    {#each breadcrumbs as breadcrumb, index}
      <span class="text-muted-foreground">/</span>
      {#if index === breadcrumbs.length - 1}
        <span class="font-medium text-foreground">{breadcrumb.name}</span>
      {:else}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => navigateToFolder(breadcrumb.id)}
          class="text-muted-foreground hover:text-foreground"
        >
          {breadcrumb.name}
        </Button>
      {/if}
    {/each}
  </div>

  <div class="flex items-center gap-2">
    {#if !uploadDisabled && (onUploadClick || onFolderUploadClick)}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <PlusIcon class="size-4 mr-2" />
            Upload
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {#if onUploadClick}
            <DropdownMenuItem onclick={onUploadClick}>
              <UploadIcon class="mr-2 size-4" />
              Upload Files
            </DropdownMenuItem>
          {/if}
          {#if onFolderUploadClick}
            <DropdownMenuItem onclick={onFolderUploadClick}>
              <FolderPlusIcon class="mr-2 size-4" />
              Upload Folder
            </DropdownMenuItem>
          {/if}
        </DropdownMenuContent>
      </DropdownMenu>
    {/if}
  </div>
</div>
