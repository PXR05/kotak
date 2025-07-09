<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { onMount } from "svelte";
  import { fade, scale, fly, slide } from "svelte/transition";
  import { Copy, Check } from "@lucide/svelte";
  import AppIcon from "$lib/components/shared/AppIcon.svelte";

  let messages = $derived(page.error?.message.split("\n") ?? []);
  function errorString() {
    return {
      status: page.status,
      url: page.url,
      error: messages,
      stack: messages.join("\n"),
    };
  }

  let expanded = $state(false);
  let copied = $state(false);

  function copyErrorDetails() {
    navigator.clipboard.writeText(JSON.stringify(errorString(), null, 2));
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function getMessage(status: number): string {
    switch (status) {
      case 404:
        return "Page not found";
      case 403:
        return "Access denied";
      case 500:
        return "Server error";
      case 502:
      case 503:
      case 504:
        return "Service unavailable";
      default:
        return "Something went wrong";
    }
  }

  const ANIMATION = {
    STAGGER: 150,
    INITIAL_DELAY: 300,
  };

  onMount(() => {
    console.error(errorString());
  });
</script>

<svelte:head>
  <title>Error {page.status}</title>
</svelte:head>

<div class="w-full">
  {#if page.status >= 400}
    <div
      class="w-full h-screen flex flex-col justify-center items-center relative isolate overflow-hidden p-2"
    >
      <div
        class="z-10 w-full h-full p-8 relative flex flex-col items-center justify-center bg-sidebar rounded-lg border border-sidebar-border"
      >
        <!-- Status code -->
        <div
          in:scale={{
            duration: 800,
            delay: ANIMATION.INITIAL_DELAY,
            opacity: 0,
            start: 0.95,
          }}
        >
          <h1
            class="font-serif text-7xl sm:text-8xl font-light tracking-tight mb-6"
          >
            {page.status}
          </h1>
        </div>

        <p
          in:fade={{
            duration: 800,
            delay: ANIMATION.INITIAL_DELAY + ANIMATION.STAGGER,
          }}
          class="font-serif text-lg md:text-xl text-muted-foreground mx-auto leading-relaxed"
        >
          {getMessage(page.status)}
        </p>

        <div
          in:fade={{
            duration: 600,
            delay: ANIMATION.INITIAL_DELAY + ANIMATION.STAGGER * 2,
          }}
          class="mt-2 text-sm font-serif text-muted-foreground"
        >
          <Button
            variant="ghost"
            size="sm"
            class="text-xs font-sans"
            onclick={() => (expanded = !expanded)}
          >
            {expanded ? "Hide details" : "Show details"}
          </Button>
        </div>

        {#if expanded}
          <div transition:slide={{ axis: "y", duration: 150 }} class="mt-4">
            <div
              class="relative backdrop-blur-sm bg-background/30 border border-border/30 rounded-xl p-5 group"
            >
              <div class="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8 text-muted-foreground/70 hover:text-foreground"
                  onclick={copyErrorDetails}
                  title="Copy error details"
                >
                  {#if copied}
                    <Check size={16} />
                  {:else}
                    <Copy size={16} />
                  {/if}
                </Button>
              </div>

              <pre
                class="text-xs font-mono text-left mx-auto opacity-80 max-h-48 overflow-auto p-2">{JSON.stringify(
                  errorString(),
                  null,
                  2
                )}</pre>
            </div>
          </div>
        {/if}

        <div
          in:fade={{
            duration: 800,
            delay: ANIMATION.INITIAL_DELAY + ANIMATION.STAGGER * 3,
          }}
          class="mt-4 opacity-80"
        >
          <a href="/">
            <AppIcon
              class="mx-auto text-muted-foreground"
              style="view-transition-name:logo"
              size={36}
            />
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>
