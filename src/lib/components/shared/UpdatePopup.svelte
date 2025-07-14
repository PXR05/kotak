<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";
  import { LoaderIcon, RotateCwIcon } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";

  let updateAvailable = $state(false);
  let loadingUpdate = $state(false);
  let swRegistration: ServiceWorkerRegistration | null = null;

  onMount(() => {
    navigator.serviceWorker?.ready.then((registration) => {
      swRegistration = registration;
      if (registration.waiting) {
        updateAvailable = true;
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              updateAvailable = true;
            }
          });
        }
      });
    });

    function handleMessage(event: MessageEvent) {
      if (event.data.type === "update-available") {
        updateAvailable = true;
      } else if (event.data.type === "sw-updated") {
        updateAvailable = false;
        loadingUpdate = false;
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  });

  function applyUpdate() {
    if (swRegistration?.waiting) {
      loadingUpdate = true;

      const handleControllerChange = () => {
        navigator.serviceWorker?.removeEventListener(
          "controllerchange",
          handleControllerChange
        );
        window.location.reload();
      };

      const timeoutId = setTimeout(() => {
        navigator.serviceWorker?.removeEventListener(
          "controllerchange",
          handleControllerChange
        );
        loadingUpdate = false;
        updateAvailable = false;
        console.warn("Service worker update timeout, reloading page");
        window.location.reload();
      }, 5000);

      navigator.serviceWorker?.addEventListener("controllerchange", () => {
        clearTimeout(timeoutId);
        handleControllerChange();
      });

      swRegistration.waiting.postMessage({ type: "skip-waiting" });
    }
  }
</script>

{#if updateAvailable}
  <Sidebar.Separator class="mb-3" />
  <div
    class="overflow-hidden rounded-lg border border-sidebar-border bg-background dark:bg-input/30 text-sm"
    transition:slide={{ axis: "y", duration: 150 }}
  >
    <div class="flex items-center justify-between pl-4 pr-2 py-2">
      <span class="font-medium">Update Available</span>
      <Button
        size="sm"
        disabled={loadingUpdate}
        class="text-xs transition-all {loadingUpdate ? 'gap-2' : '!gap-0'}"
        variant="outline"
        onclick={applyUpdate}
      >
        {#if loadingUpdate}
          <LoaderIcon class="size-4 animate-spin" />
        {:else}
          <RotateCwIcon class="size-4" />
        {/if}
      </Button>
    </div>
  </div>
{/if}
