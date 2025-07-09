<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import type { FileItem, FileAction } from "$lib/types/file.js";
  import {
    XIcon,
    DownloadIcon,
    TrashIcon,
    Share2Icon,
    MoreHorizontalIcon,
  } from "@lucide/svelte";

  let {
    file,
    onClose,
    onAction,
    onDownload,
    showActions = true,
  }: {
    file: FileItem;
    onClose: () => void;
    onAction: (action: FileAction) => void;
    onDownload: () => void;
    showActions?: boolean;
  } = $props();

  const styles = {
    background:
      "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2",
    separator:
      "w-px dark:w-0.5 h-6 dark:bg-border bg-muted-foreground rounded-full",
  } as const;
</script>

<div class="w-full flex items-start justify-between p-2 gap-2">
  <div
    class="flex items-center gap-2 max-w-[calc(100vw-4.5rem)] sm:max-w-[calc(100vw-11rem)]"
  >
    <Button
      variant="ghost"
      size="icon"
      class="{styles.background} size-11"
      onclick={onClose}
    >
      <XIcon class="size-4" />
    </Button>
    <h2 class="{styles.background} !h-11 px-3 font-medium truncate">
      {file.name}
    </h2>
  </div>

  <div class="flex items-center gap-2">
    <div class="{styles.background} !p-1">
      <Button
        variant="ghost"
        size="sm"
        onclick={onDownload}
        class="h-9 max-sm:hidden"
      >
        <DownloadIcon class="size-4" />
        <span class="max-lg:hidden"> Download </span>
      </Button>
      {#if showActions}
        <span class="{styles.separator} max-sm:hidden"></span>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onAction("share")}
          class="h-9 max-sm:hidden"
        >
          <Share2Icon class="size-4" />
          <span class="max-lg:hidden"> Share </span>
        </Button>
        <span class="{styles.separator} max-sm:hidden"></span>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onAction("trash")}
          class="text-destructive hover:text-destructive h-9 max-sm:hidden"
        >
          <TrashIcon class="size-4" />
          <span class="max-lg:hidden"> Trash </span>
        </Button>
      {/if}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" size="sm" class="h-9 sm:hidden">
            <MoreHorizontalIcon class="size-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-48">
          <DropdownMenu.Item onclick={onDownload}>
            <DownloadIcon class="size-4" />
            Download
          </DropdownMenu.Item>
          {#if showActions}
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={() => onAction("share")}>
              <Share2Icon class="size-4" />
              Share
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onclick={() => onAction("trash")}
              variant="destructive"
            >
              <TrashIcon class="size-4" />
              Move to Trash
            </DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>
</div>
