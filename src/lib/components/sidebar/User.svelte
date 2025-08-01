<script lang="ts">
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
  import PanelRightIcon from "@lucide/svelte/icons/panel-right";
  import { toggleMode } from "mode-watcher";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { settings, updateSidebarSide } from "$lib/stores";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";

  const user = $derived(page.data?.user);

  const currentSidebarSide = $derived(settings.getSetting("sidebarSide"));

  function toggleSidebarSide() {
    const newSide = currentSidebarSide === "left" ? "right" : "left";
    updateSidebarSide(newSide);
  }
</script>

<Sidebar.MenuItem>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Sidebar.MenuButton
          {...props}
          size="lg"
          class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar.Root class="size-9 rounded-md">
            <Avatar.Fallback
              class="bg-sidebar-primary text-sidebar-primary-foreground font-serif rounded-md"
            >
              {user?.email.charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="font-serif truncate font-medium"
              >{user?.email.split("@")[0].toUpperCase()}</span
            >
            <span class="truncate text-xs text-muted-foreground"
              >{user?.email}</span
            >
          </div>
          <ChevronsUpDownIcon class="ml-auto size-4" />
        </Sidebar.MenuButton>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
      side="bottom"
      align="start"
      sideOffset={4}
    >
      <div class="flex items-center gap-2 p-1 text-left text-sm">
        <Avatar.Root class="size-9 rounded-md">
          <Avatar.Fallback
            class="bg-sidebar-primary text-sidebar-primary-foreground font-serif rounded-md"
          >
            {user?.email.charAt(0).toUpperCase()}
          </Avatar.Fallback>
        </Avatar.Root>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="font-serif truncate font-medium"
            >{user?.email.split("@")[0].toUpperCase()}</span
          >
          <span class="truncate text-xs text-muted-foreground"
            >{user?.email}</span
          >
        </div>
      </div>
      <DropdownMenu.Separator />
      <DropdownMenu.Group>
        <DropdownMenu.Item
          onclick={(e) => {
            e.preventDefault();
            toggleMode();
          }}
          onselect={(e) => e.preventDefault()}
        >
          <SunIcon
            class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <MoonIcon
            class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
          Theme
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onclick={(e) => {
            e.preventDefault();
            toggleSidebarSide();
          }}
          onselect={(e) => e.preventDefault()}
        >
          {#if currentSidebarSide === "left"}
            <PanelRightIcon class="h-4 w-4" />
          {:else}
            <PanelLeftIcon class="h-4 w-4" />
          {/if}
          Sidebar Side
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        variant="destructive"
        onclick={async () => {
          const res = await fetch("/?/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
          if (!res.ok) {
            toast.error("Failed to log out. Please try again.");
          } else {
            await goto("/auth/login", {
              invalidateAll: true,
            });
          }
        }}
      >
        <LogOutIcon />
        Log out
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</Sidebar.MenuItem>
