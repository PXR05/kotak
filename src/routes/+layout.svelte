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

  let { children } = $props();
</script>

<Toaster />
<ModeWatcher />
<Dialogs />

{#if page.data.user}
  <Sidebar.Provider class="select-none">
    <AppSidebar />
    <Sidebar.Inset>
      <header class="flex h-16 shrink-0 items-center gap-2">
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
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
        {@render children()}
      </div>
    </Sidebar.Inset>
  </Sidebar.Provider>
{:else}
  <div class="flex flex-col">
    {@render children()}
  </div>
{/if}
