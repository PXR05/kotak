<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { SunIcon, MoonIcon, HomeIcon } from "@lucide/svelte";
  import { toggleMode } from "mode-watcher";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import AppSidebar from "$lib/components/sidebar/AppSidebar.svelte";

  let { children } = $props();

  const breadcrumbs = $derived(page.data?.breadcrumbs || []);

  function navigateToFolder(folderId: string) {
    goto(`/${folderId}`);
  }

  function navigateToRoot() {
    goto("/");
  }
</script>

<ModeWatcher />
<Sidebar.Provider class="select-none">
  <AppSidebar />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-2">
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />

        <!-- Dynamic Breadcrumbs -->
        <div class="flex items-center space-x-2">
          <Breadcrumb.Root>
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link href="/" onclick={() => navigateToRoot()}>
                  <HomeIcon class="size-4" />
                </Breadcrumb.Link>
              </Breadcrumb.Item>

              {#each breadcrumbs as breadcrumb, index}
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  {#if index === breadcrumbs.length - 1}
                    <Breadcrumb.Page>{breadcrumb.name}</Breadcrumb.Page>
                  {:else}
                    <Breadcrumb.Link
                      href="/{breadcrumb.id}"
                      onclick={(e) => {
                        e.preventDefault();
                        navigateToFolder(breadcrumb.id);
                      }}
                    >
                      {breadcrumb.name}
                    </Breadcrumb.Link>
                  {/if}
                </Breadcrumb.Item>
              {/each}
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </div>
      </div>
    </header>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
      {@render children()}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>

<Button
  onclick={toggleMode}
  variant="outline"
  size="icon"
  class="fixed bottom-4 right-4 border-r-0 border-b-0 rounded-none rounded-tl-lg !bg-transparent"
>
  <SunIcon
    class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
  />
  <MoonIcon
    class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
  />
  <span class="sr-only">Toggle theme</span>
</Button>
