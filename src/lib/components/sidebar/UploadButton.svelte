<script lang="ts">
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { fileOperations } from "$lib/stores";
  import type { UploadableFile } from "$lib/types/file";
  import { FolderPlusIcon, PlusIcon, UploadIcon } from "@lucide/svelte";

  let fileInputRef: HTMLInputElement;
  let folderInputRef: HTMLInputElement;

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      const uploadableFiles: UploadableFile[] = Array.from(files).map(
        (file) => {
          const webkitPath = file.webkitRelativePath;
          const relativePath = webkitPath || file.name;

          return {
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            relativePath:
              webkitPath && webkitPath !== file.name ? relativePath : undefined,
          };
        }
      );
      fileOperations.handleFilesUpload(uploadableFiles);
      target.value = "";
    }
  }
</script>

<!-- Hidden file input for upload -->
<input
  bind:this={fileInputRef}
  type="file"
  multiple
  class="hidden"
  onchange={handleFileInputChange}
/>

<!-- Hidden folder input for folder upload -->
<input
  bind:this={folderInputRef}
  type="file"
  webkitdirectory
  class="hidden"
  onchange={handleFileInputChange}
/>

<Sidebar.MenuItem class="px-2">
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <Sidebar.MenuButton
          {...props}
          size="lg"
          class="bg-sidebar-primary hover:bg-sidebar-primary/90 active:bg-sidebar-primary/80 text-sidebar-primary-foreground hover:text-sidebar-primary-foreground active:text-sidebar-primary-foreground transition-colors flex items-center px-4"
        >
          <PlusIcon strokeWidth={2} class="size-6" absoluteStrokeWidth />
          <span class="text-base"> New </span>
        </Sidebar.MenuButton>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="center" class="w-56">
      <DropdownMenuItem onclick={() => fileInputRef.click()}>
        <UploadIcon class="mr-2 size-4" />
        Upload Files
      </DropdownMenuItem>
      <DropdownMenuItem onclick={() => folderInputRef.click()}>
        <FolderPlusIcon class="mr-2 size-4" />
        Upload Folder
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</Sidebar.MenuItem>
