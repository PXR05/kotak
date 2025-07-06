<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import AppSidebar from "$lib/components/sidebar/AppSidebar.svelte";
  import Dialogs from "$lib/components/dialog/Dialogs.svelte";
  import Breadcrumb from "$lib/components/sidebar/Breadcrumb.svelte";
  import Search from "$lib/components/sidebar/Search.svelte";
  import { page } from "$app/state";
  import { settings } from "$lib/stores";

  let { children } = $props();

  const side = $derived(settings.getSetting("sidebarSide"));
</script>

<Toaster />
<ModeWatcher />
<Dialogs />

{#if page.data.user}
  <Sidebar.Provider
    class="select-none {side === 'left' ? 'flex-row' : 'flex-row-reverse'}"
  >
    <AppSidebar {side} />
    <Sidebar.Inset class="py-2 gap-2 {side === 'left' ? 'pr-2' : 'pl-2'}">
      <header
        class="flex h-16 shrink-0 items-center gap-2 bg-sidebar rounded-lg border border-sidebar-border shadow-sm"
      >
        <div class="flex items-center justify-between w-full gap-4 px-4">
          <div class="flex items-center gap-2">
            <Sidebar.Trigger class="-ml-1" />
            <Separator
              orientation="vertical"
              class="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb />
          </div>
          <Search />
        </div>
      </header>
      <div
        class="flex flex-1 flex-col overflow-clip bg-sidebar rounded-lg border border-sidebar-border shadow-sm"
      >
        {@render children()}
      </div>
    </Sidebar.Inset>
  </Sidebar.Provider>
{:else}
  <div class="flex flex-col">
    {@render children()}
  </div>
{/if}
