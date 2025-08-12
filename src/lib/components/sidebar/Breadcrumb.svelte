<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { page } from "$app/state";
  import { HouseIcon, LoaderIcon } from "@lucide/svelte";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte.js";
  import { getBreadcrumbs } from "$lib/remote/load.remote";
  import { toast } from "svelte-sonner";

  const isMobile = new IsMobile();
  const isTrashPage = $derived(page.route?.id === "/trash");

  let breadcrumbs: {
    id: string;
    name: string;
  }[] = $state([]);
  let loading = $state(true);

  $effect(() => {
    if (!page.data.currentFolderId) {
      breadcrumbs = [];
      loading = false;
      return;
    }
    loading = true;
    try {
      getBreadcrumbs(page.data.currentFolderId).then(({ data, error }) => {
        if (error) {
          toast.error(error);
        }
        breadcrumbs = data ?? [];
        loading = false;
      });
    } catch (error) {
      console.error("Error fetching breadcrumbs:", error);
      toast.error("Failed to load breadcrumbs");
      loading = false;
    }
  });

  const ITEMS_TO_DISPLAY = $derived(isMobile.current ? 2 : 4);
</script>

<Breadcrumb.Root>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/">
        <HouseIcon class="size-4" />
      </Breadcrumb.Link>
    </Breadcrumb.Item>

    {#if isTrashPage}
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page class="flex items-center gap-2">Trash</Breadcrumb.Page>
      </Breadcrumb.Item>
    {:else if loading}
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <LoaderIcon class="size-4 animate-spin" />
      </Breadcrumb.Item>
    {:else if breadcrumbs.length > 0}
      <Breadcrumb.Separator />

      {#if breadcrumbs.length > ITEMS_TO_DISPLAY - 1}
        <Breadcrumb.Item>
          {#if !isMobile.current}
            <!-- Desktop: Dropdown Menu -->
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class="flex items-center gap-1"
                aria-label="Toggle menu"
              >
                <Breadcrumb.Ellipsis class="size-4" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                {#each breadcrumbs.slice(0, -(ITEMS_TO_DISPLAY - 1)) as item}
                  <DropdownMenu.Item>
                    {#snippet child({ props })}
                      <a {...props} href="/{item.id}">{item.name}</a>
                    {/snippet}
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {:else}
            <!-- Mobile: Drawer -->
            <Drawer.Root>
              <Drawer.Trigger aria-label="Toggle Menu">
                <Breadcrumb.Ellipsis class="h-4 w-4" />
              </Drawer.Trigger>
              <Drawer.Content>
                <Drawer.Header class="text-left">
                  <Drawer.Title>Navigate to</Drawer.Title>
                  <Drawer.Description>
                    Select a page to navigate to.
                  </Drawer.Description>
                </Drawer.Header>
                <div class="grid gap-1 px-4">
                  {#each breadcrumbs.slice(0, -(ITEMS_TO_DISPLAY - 1)) as item}
                    <Button
                      variant="secondary"
                      href="/{item.id}"
                      class="justify-start py-1 text-sm"
                    >
                      {item.name}
                    </Button>
                  {/each}
                </div>
                <Drawer.Footer class="pt-4">
                  <Drawer.Close>
                    <Button variant="outline">Close</Button>
                  </Drawer.Close>
                </Drawer.Footer>
              </Drawer.Content>
            </Drawer.Root>
          {/if}
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
      {/if}

      {#each breadcrumbs.slice(-(ITEMS_TO_DISPLAY - 1)) as item, index}
        <Breadcrumb.Item>
          {#if index < breadcrumbs.slice(-(ITEMS_TO_DISPLAY - 1)).length - 1}
            <Breadcrumb.Link
              href="/{item.id}"
              class="max-w-20 truncate md:max-w-none"
            >
              {item.name}
            </Breadcrumb.Link>
            <Breadcrumb.Separator />
          {:else}
            <Breadcrumb.Page class="max-w-20 truncate md:max-w-none">
              {item.name}
            </Breadcrumb.Page>
          {/if}
        </Breadcrumb.Item>
      {/each}
    {/if}
  </Breadcrumb.List>
</Breadcrumb.Root>
