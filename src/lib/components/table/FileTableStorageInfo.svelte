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
    SearchIcon,
  } from "@lucide/svelte";

  let {
    uploadDisabled = false,
    onUploadClick,
    onFolderUploadClick,
  }: {
    uploadDisabled?: boolean;
    onUploadClick?: () => void;
    onFolderUploadClick?: () => void;
  } = $props();
</script>

<div class="flex items-center justify-between p-4 border-b">
  <div class="flex items-center space-x-2">
    <!-- Space reserved for breadcrumbs (now in layout) -->
  </div>

  <div class="flex items-center gap-2">
    <Button variant="outline" size="sm">
      <SearchIcon class="size-4 mr-2" />
      Search
    </Button>
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
