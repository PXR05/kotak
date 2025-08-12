<script lang="ts">
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
  } from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { fileOperations } from "$lib/stores";
  import type { UploadableFile } from "$lib/types/file";
  import {
    FolderEditIcon,
    FolderPlusIcon,
    PlusIcon,
    UploadIcon,
  } from "@lucide/svelte";

  const isMobile = $derived(new IsMobile().current);

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

<input
  bind:this={fileInputRef}
  type="file"
  multiple
  class="hidden"
  onchange={handleFileInputChange}
/>

<input
  bind:this={folderInputRef}
  type="file"
  webkitdirectory
  class="hidden"
  onchange={handleFileInputChange}
/>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Sidebar.MenuButton
        {...props}
        size="lg"
        class="bg-primary hover:bg-
        primary/90 active:bg-primary/80 text-primary-foreground hover:text-primary-foreground active:text-primary-foreground transition-colors flex items-center max-md:justify-center px-4 max-md:size-14 max-md:rounded-lg max-md:shadow-lg"
      >
        <PlusIcon
          strokeWidth={1.5}
          class="md:!size-6 !size-7"
          absoluteStrokeWidth
        />
        <span class="text-base font-medium max-md:hidden"> New </span>
      </Sidebar.MenuButton>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent
    align={isMobile ? "end" : "center"}
    class="md:w-(--bits-dropdown-menu-anchor-width) md:min-w-52"
  >
    <DropdownMenuItem
      onclick={() => {
        fileInputRef.click();
      }}
    >
      <UploadIcon class="mr-2 size-4" />
      Upload Files
    </DropdownMenuItem>
    <DropdownMenuItem
      onclick={() => {
        folderInputRef.click();
      }}
    >
      <FolderPlusIcon class="mr-2 size-4" />
      Upload Folder
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onclick={() => {
        fileOperations.handleContextMenuAction("create-folder");
      }}
    >
      <FolderEditIcon class="mr-2 size-4" />
      Create Folder
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
