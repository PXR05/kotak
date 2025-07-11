<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input";
  import { filePreviewDialogData, navigateToFile } from "$lib/stores";
  import {
    ZoomInIcon,
    ZoomOutIcon,
    RotateCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
  } from "@lucide/svelte";
  import { onMount, onDestroy } from "svelte";
  import styles from "./styles";

  let {
    zoom = $bindable(1),
    supportsZoom,
    onRotate,
    hideTimeout = 3000,
  }: {
    zoom: number;
    supportsZoom: boolean;
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

  function handleZoomIn() {
    zoom = Math.min(zoom + 0.25, 3.0);
  }

  function handleZoomOut() {
    zoom = Math.max(zoom - 0.25, 0.25);
  }

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
    if (filePreviewDialogData.fileList.length <= 1) {
      return;
    }
    const newIndex = Math.max(filePreviewDialogData.currentIndex - 1, 0);
    navigateToFile(newIndex);
  }

  function handleNext() {
    if (filePreviewDialogData.fileList.length <= 1) {
      return;
    }
    const newIndex = Math.min(
      filePreviewDialogData.currentIndex + 1,
      filePreviewDialogData.fileList.length - 1
    );
    navigateToFile(newIndex);
  }

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("input")) {
      return;
    }
    if (event.key === "ArrowLeft" && canGoPrevious) {
      handlePrevious();
    } else if (event.key === "ArrowRight" && canGoNext) {
      handleNext();
    } else if (event.key === "Escape") {
      if (typeof window !== "undefined") {
        window.history.back();
      }
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
      class="absolute z-10 flex items-center justify-between gap-2 left-2 right-2 top-1/2 -translate-y-1/2"
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
        onclick={handleZoomOut}
        disabled={zoom <= 0.25}
      >
        <ZoomOutIcon class="size-4" />
      </Button>
      <Input
        type="number"
        inputmode="numeric"
        value={Math.round(zoom * 100)}
        min="25"
        max="300"
        step="25"
        oninput={(e) => {
          resetTimer();
          const target = e.currentTarget;
          const value = parseFloat(target.value);
          if (!isNaN(value)) {
            zoom = Math.max(0.25, Math.min(value / 100, 3.0));
          }
        }}
        class="w-14 text-center px-2 bg-input/50 dark:border-input border-input/50"
      />
      <Button
        variant="ghost"
        size="icon"
        onclick={handleZoomIn}
        disabled={zoom >= 3.0}
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
