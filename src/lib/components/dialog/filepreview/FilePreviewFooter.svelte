<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import type { FileItem } from "$lib/types/file.js";
  import { formatDate, formatFileSize } from "$lib/utils/format";
  import {
    CalendarIcon,
    HashIcon,
    InfoIcon,
    UserIcon,
    FileIcon,
    HardDriveIcon,
  } from "@lucide/svelte";
  import styles from "./styles";
  import { slide } from "svelte/transition";

  let {
    file,
  }: {
    file: FileItem;
  } = $props();

  let expanded = $state(false);
</script>

<div
  class="absolute bottom-0 left-0 right-0 p-2 flex items-end gap-2 w-full z-50
  {expanded ? 'max-sm:flex-col-reverse max-sm:items-start' : ''}"
>
  <Button
    variant="ghost"
    size="icon"
    class="{styles.background} size-11"
    onclick={() => {
      expanded = !expanded;
    }}
  >
    <InfoIcon class="size-4" />
  </Button>

  {#if expanded}
    <div class={styles.background}>
      <div
        transition:slide={{
          axis: "y",
          duration: 150,
        }}
        class="p-3 space-y-4"
      >
        <!-- File Information Section -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-border/50">
            <FileIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-semibold text-foreground"
              >File Information</span
            >
          </div>

          <div class="grid gap-3">
            <!-- File Name -->
            <div class="grid grid-cols-[80px_1fr] gap-3 items-start">
              <span class="text-xs text-muted-foreground font-medium">Name</span
              >
              <span class="text-sm font-medium break-all">{file.name}</span>
            </div>

            <!-- File Size -->
            {#if file.size !== undefined}
              <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span class="text-xs text-muted-foreground font-medium"
                  >Size</span
                >
                <div class="flex items-center gap-2">
                  <HardDriveIcon class="size-3 text-muted-foreground" />
                  <span class="text-sm">{formatFileSize(file.size)}</span>
                </div>
              </div>
            {/if}

            <!-- File Type -->
            {#if file.mimeType}
              <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span class="text-xs text-muted-foreground font-medium"
                  >Type</span
                >
                <span
                  class="bg-muted px-2 py-1 rounded text-xs font-mono w-fit"
                >
                  {file.mimeType}
                </span>
              </div>
            {/if}
          </div>
        </div>

        <!-- System Information Section -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-border/50">
            <HashIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-semibold text-foreground"
              >System Information</span
            >
          </div>

          <div class="grid gap-3">
            <!-- File ID -->
            <div class="grid grid-cols-[80px_1fr] gap-3 items-start">
              <span class="text-xs text-muted-foreground font-medium">ID</span>
              <span
                class="text-xs font-mono text-muted-foreground break-all bg-muted/50 px-2 py-1 rounded"
              >
                {file.id}
              </span>
            </div>

            <!-- Owner -->
            <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span class="text-xs text-muted-foreground font-medium"
                >Owner</span
              >
              <div class="flex items-center gap-2">
                <UserIcon class="size-3 text-muted-foreground" />
                <span class="text-sm">{file.ownerId}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline Section -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-border/50">
            <CalendarIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-semibold text-foreground">Timeline</span>
          </div>

          <div class="grid gap-3">
            <!-- Created Date -->
            <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span class="text-xs text-muted-foreground font-medium"
                >Created</span
              >
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-sm">{formatDate(file.createdAt)}</span>
              </div>
            </div>

            <!-- Modified Date -->
            <div class="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span class="text-xs text-muted-foreground font-medium"
                >Modified</span
              >
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-sm">{formatDate(file.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if !expanded}
    <div
      in:slide={{
        axis: "y",
        duration: 150,
        delay: 150,
      }}
      class="{styles.background} h-11 flex items-center"
    >
      <div
        class="w-fit flex items-center px-2 gap-4 text-sm font-medium dark:text-muted-foreground"
      >
        <span>{formatFileSize(file.size ?? 0)}</span>
        <span class={styles.separator}></span>
        <span
          >{(
            file.mimeType?.split("/")[1] ||
            file.mimeType?.split("/")[0] ||
            "file"
          ).toUpperCase()}</span
        >
        <span class={styles.separator}></span>
        <span>{file.updatedAt?.toLocaleString()}</span>
      </div>
    </div>
  {/if}
</div>
