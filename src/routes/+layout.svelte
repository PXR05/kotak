<script lang="ts">
  import { page } from "$app/state";
  import Dialogs from "$lib/components/dialog/Dialogs.svelte";
  import UploadProgressPopup from "$lib/components/shared/UploadProgressPopup.svelte";
  import AppSidebar from "$lib/components/sidebar/AppSidebar.svelte";
  import InsetHeader from "$lib/components/sidebar/InsetHeader.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { settings } from "$lib/stores";
  import { ModeWatcher } from "mode-watcher";
  import "../app.css";

  let { children } = $props();

  const side = $derived(settings.getSetting("sidebarSide"));
</script>

<Toaster position="top-right" richColors />
<ModeWatcher />
<Dialogs />
<UploadProgressPopup />

{#if page.data.user}
  <Sidebar.Provider
    class="select-none {side === 'left' ? 'flex-row' : 'flex-row-reverse'}"
  >
    <AppSidebar {side} />
    <Sidebar.Inset
      class="py-2 gap-2 max-md:px-2
      {side === 'left' ? 'pr-2' : 'pl-2'} 
      {Sidebar.useSidebar()?.state === 'collapsed' ? 'px-2' : ''}"
    >
      <InsetHeader />
      <div
        class="flex flex-1 flex-col overflow-clip bg-sidebar rounded-lg border border-border shadow-sm"
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
