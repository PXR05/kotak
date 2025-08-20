<script lang="ts">
  import { Separator } from "$lib/components/ui/separator/index.js";
  import Breadcrumb from "$lib/components/sidebar/Breadcrumb.svelte";
  import Search from "$lib/components/sidebar/Search.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { slide } from "svelte/transition";
  import { KeyRoundIcon } from "@lucide/svelte";

  const needsUMKRestore = $derived(page.data.user && !page.data.umk);

  const isMobile = $derived(new IsMobile().current);
  const inRoot = $derived(browser && page.url.pathname === "/");

  const backgroundClass =
    "bg-sidebar rounded-lg border border-border shadow-sm";
</script>

{#if isMobile}
  {#if needsUMKRestore}
    <div
      class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between gap-2"
      transition:slide={{ axis: "y", duration: 200 }}
    >
      <div class="flex items-center gap-2 text-sm">
        <KeyRoundIcon class="size-4 text-amber-600 dark:text-amber-400" />
        <span class="text-amber-800 dark:text-amber-200">
          Open sidebar and tap "Unlock" to access encrypted files
        </span>
      </div>
    </div>
  {/if}

  <header class="flex shrink-0 items-center justify-between gap-2">
    <div class="flex items-center gap-2 {backgroundClass}">
      <Sidebar.Trigger class="size-12" />
      {#if !inRoot}
        <Separator
          orientation="vertical"
          class="mr-2 -ml-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb />
        <span class="w-3"></span>
      {/if}
    </div>
    {#if inRoot}
      <Search alwaysOpen />
    {:else}
      <Search />
    {/if}
  </header>
{:else}
  <header class="flex h-16 shrink-0 items-center gap-2 {backgroundClass}">
    <div class="flex items-center justify-between w-full gap-4 px-4">
      <div class="flex items-center gap-2">
        <Sidebar.Trigger />
        <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb />
      </div>
      <Search />
    </div>
  </header>
{/if}
