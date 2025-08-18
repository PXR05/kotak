<script lang="ts">
  import { uploadProgressStore } from "$lib/stores/file/uploadProgress.svelte.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ChevronDown, ChevronUp, X } from "@lucide/svelte";
  import { capitalize } from "$lib/utils/format";
  import { slide } from "svelte/transition";

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "border-emerald-500 dark:border-emerald-400/75 bg-emerald-400/10 text-emerald-700 dark:text-emerald-500/75";
      case "error":
        return "border-red-500 dark:border-red-400/75 bg-red-400/10 text-red-700 dark:text-red-500/75";
      case "uploading":
        return "border-blue-500 dark:border-blue-400/75 bg-blue-400/10 text-blue-700 dark:text-blue-500/75";
      case "queued":
        return "border-orange-500 dark:border-orange-400/75 bg-orange-400/10 text-orange-700 dark:text-orange-500/75";
      default:
        return "border-gray-500 dark:border-gray-400/75 bg-gray-400/10 text-gray-700 dark:text-gray-500/75";
    }
  }
</script>

{#if uploadProgressStore.isVisible && uploadProgressStore.uploadProgress}
  <div
    transition:slide={{ duration: 150, axis: "y" }}
    class="fixed bottom-4 max-md:left-4 md:right-4 z-50 md:w-96 w-full max-w-[calc(100dvw-6rem)]"
  >
    <div
      class="flex flex-col bg-sidebar rounded-lg border border-border shadow-sm overflow-clip"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 bg-muted/50">
        <div class="flex items-center gap-2 flex-1 text-sm font-medium">
          {#if uploadProgressStore.uploadProgress.overallProgress >= 100}
            Upload complete ({uploadProgressStore.uploadProgress
              .filesCompleted}/{uploadProgressStore.uploadProgress.totalFiles})
          {:else}
            Uploading ({uploadProgressStore.uploadProgress
              .filesCompleted}/{uploadProgressStore.uploadProgress.totalFiles})
          {/if}
        </div>

        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0"
            onclick={() =>
              uploadProgressStore.isMinimized
                ? uploadProgressStore.maximize()
                : uploadProgressStore.minimize()}
          >
            {#if uploadProgressStore.isMinimized}
              <ChevronUp class="h-4 w-4" />
            {:else}
              <ChevronDown class="h-4 w-4" />
            {/if}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0"
            onclick={() => uploadProgressStore.hide()}
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>

      {#if !uploadProgressStore.isMinimized}
        <!-- File List -->
        <div
          transition:slide={{ duration: 150, axis: "y" }}
          class="max-h-56 overflow-y-auto border-t"
        >
          {#each Array.from(uploadProgressStore.uploadProgress.fileProgresses.values()) as fileProgress (fileProgress.fileName)}
            <div
              class="flex flex-col gap-1 p-3 border-b last:border-b-0 hover:bg-muted/30"
            >
              <div class="flex items-center justify-between mb-1">
                <span
                  class="text-sm font-medium truncate"
                  title={fileProgress.fileName}
                >
                  {fileProgress.fileName}
                </span>
                <Badge
                  variant="outline"
                  class="text-xs ml-2 font-normal {getStatusColor(
                    fileProgress.status
                  )}"
                >
                  {capitalize(fileProgress.status)}
                </Badge>
              </div>

              {#if fileProgress.status === "uploading" || fileProgress.status === "completed"}
                <Progress value={fileProgress.progress} class="h-1" />
              {:else if fileProgress.status === "error" && fileProgress.error}
                <p class="text-xs text-destructive">{fileProgress.error}</p>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Footer -->
        {#if uploadProgressStore.uploadProgress.currentFile}
          <div
            transition:slide={{ duration: 150, axis: "y" }}
            class="p-3 bg-muted/30 text-xs text-muted-foreground truncate"
          >
            Currently uploading: {uploadProgressStore.uploadProgress
              .currentFile}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
