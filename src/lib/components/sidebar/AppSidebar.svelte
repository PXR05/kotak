<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu/index.js";
  import type { ComponentProps } from "svelte";
  import { PlusIcon, UploadIcon, FolderPlusIcon } from "@lucide/svelte";
  import type { UploadableFile } from "$lib/types/file";
  import SideFooter from "./SideFooter.svelte";
  import SideContent from "./SideContent.svelte";
  import { fileOperations } from "$lib/stores";

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

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

<Sidebar.Root bind:ref variant="inset" {...restProps}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <Sidebar.MenuButton
                {...props}
                size="lg"
                class="bg-sidebar-primary hover:bg-sidebar-primary/90 active:bg-sidebar-primary/80 transition-colors grid place-items-center"
              >
                <PlusIcon strokeWidth={3} class="size-6" absoluteStrokeWidth />
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
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <SideContent />
  </Sidebar.Content>
  <Sidebar.Footer>
    <SideFooter />
  </Sidebar.Footer>
</Sidebar.Root>
