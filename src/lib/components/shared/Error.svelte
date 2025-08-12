<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import { Copy, Check } from "@lucide/svelte";
  import AppIcon from "$lib/components/shared/AppIcon.svelte";

  const {
    messages = [],
    status,
    statusMessage,
  }: {
    messages: string[];
    status: number;
    statusMessage?: string;
  } = $props();

  const errorString = $derived({
    status: status,
    url: page.url,
    error: messages,
    stack: messages.join("\n"),
  });

  let expanded = $state(false);
  let copied = $state(false);

  function copyErrorDetails() {
    navigator.clipboard.writeText(JSON.stringify(errorString, null, 2));
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const defaultStatusMessage = $derived.by(() => {
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
  });

  onMount(() => {
    console.error(errorString);
  });
</script>

<div
  class="w-full flex flex-col justify-center items-center relative isolate overflow-hidden p-2 {page
    .data.user
    ? 'h-full'
    : 'h-dvh'}"
>
  <div
    class="z-10 w-full h-full p-8 relative flex flex-col items-center justify-center bg-sidebar rounded-lg border border-border"
  >
    <!-- Status code -->
    <div>
      <h1
        class="font-serif text-7xl sm:text-8xl font-light tracking-tight mb-6"
      >
        {status}
      </h1>
    </div>

    <p
      class="font-serif text-lg md:text-xl text-muted-foreground mx-auto leading-relaxed"
    >
      {statusMessage || defaultStatusMessage}
    </p>

    <div class="mt-2 text-sm font-serif text-muted-foreground">
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
              errorString,
              null,
              2
            )}</pre>
        </div>
      </div>
    {/if}

    <div class="mt-4 opacity-80">
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
