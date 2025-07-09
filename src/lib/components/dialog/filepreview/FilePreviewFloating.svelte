<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { filePreviewDialogData } from "$lib/stores";
  import {
    ZoomInIcon,
    ZoomOutIcon,
    RotateCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
  } from "@lucide/svelte";
  import { onMount, onDestroy } from "svelte";

  let {
    zoom,
    supportsZoom,
    onZoomIn,
    onZoomOut,
    onRotate,
    hideTimeout = 3000,
  }: {
    zoom: number;
    supportsZoom: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRotate: () => void;
    hideTimeout?: number;
  } = $props();

  let isVisible = $state(true);
  let showNavigation = $derived(filePreviewDialogData.fileList.length > 1);
  let canGoPrevious = $derived(filePreviewDialogData.currentIndex > 0);
  let canGoNext = $derived(
    filePreviewDialogData.currentIndex <
      filePreviewDialogData.fileList.length - 1
  );
  let timeoutId: NodeJS.Timeout | number | null = null;

  const styles = {
    background:
      "flex items-center gap-2 bg-sidebar/75 border border-sidebar-border backdrop-blur-sm rounded-lg p-2",
    separator:
      "w-px dark:w-0.5 h-6 dark:bg-border bg-muted-foreground rounded-full",
  } as const;

  function resetTimer() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    isVisible = true;
    timeoutId = setTimeout(() => {
      isVisible = false;
    }, hideTimeout);
  }

  function handleMouseActivity() {
    resetTimer();
  }

  onMount(() => {
    resetTimer();
  });

  onDestroy(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  function handlePrevious() {
    filePreviewDialogData.currentIndex =
      (filePreviewDialogData.currentIndex -
        1 +
        filePreviewDialogData.fileList.length) %
      filePreviewDialogData.fileList.length;
    filePreviewDialogData.file =
      filePreviewDialogData.fileList[filePreviewDialogData.currentIndex];
    filePreviewDialogData.open = true;
  }

  function handleNext() {
    filePreviewDialogData.currentIndex =
      (filePreviewDialogData.currentIndex + 1) %
      filePreviewDialogData.fileList.length;
    filePreviewDialogData.file =
      filePreviewDialogData.fileList[filePreviewDialogData.currentIndex];
    filePreviewDialogData.open = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft" && canGoPrevious) {
      handlePrevious();
    } else if (event.key === "ArrowRight" && canGoNext) {
      handleNext();
    }
  }
</script>

<svelte:window
  onmousemove={handleMouseActivity}
  onmousedown={handleMouseActivity}
  onmouseup={handleMouseActivity}
  onclick={handleMouseActivity}
  ontouchmove={handleMouseActivity}
  ontouchstart={handleMouseActivity}
  ontouchend={handleMouseActivity}
  ontouchcancel={handleMouseActivity}
  onkeydown={handleKeydown}
/>

<div
  class="transition-opacity duration-150 {isVisible
    ? 'opacity-100'
    : 'opacity-0'}"
>
  {#if showNavigation}
    <div
      class="absolute z-10 flex items-center justify-between gap-2 left-4 right-4 top-1/2 -translate-y-1/2"
    >
      <Button
        variant="ghost"
        size="icon"
        class="{styles.background} size-11"
        onclick={handlePrevious}
        disabled={!canGoPrevious}
      >
        <ChevronLeftIcon class="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="{styles.background} size-11"
        onclick={handleNext}
        disabled={!canGoNext}
      >
        <ChevronRightIcon class="size-5" />
      </Button>
    </div>
  {/if}
  {#if supportsZoom}
    <div
      class="{styles.background} !p-1 absolute z-10 left-1/2 -translate-x-1/2 bottom-15"
    >
      <Button
        variant="ghost"
        size="icon"
        onclick={onZoomOut}
        disabled={zoom <= 25}
      >
        <ZoomOutIcon class="size-4" />
      </Button>
      <span
        class="justify-center text-sm font-medium text-muted-foreground w-14 text-center"
      >
        {zoom}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        onclick={onZoomIn}
        disabled={zoom >= 300}
      >
        <ZoomInIcon class="size-4" />
      </Button>
      <span class={styles.separator}></span>
      <Button variant="ghost" size="icon" onclick={onRotate}>
        <RotateCwIcon class="size-4" />
      </Button>
    </div>
  {/if}
</div>
