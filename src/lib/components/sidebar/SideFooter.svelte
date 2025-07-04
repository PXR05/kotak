<script lang="ts">
//   import BadgeCheckIcon from "@lucide/svelte/icons/badge-check";
//   import BellIcon from "@lucide/svelte/icons/bell";
//   import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
//   import CreditCardIcon from "@lucide/svelte/icons/credit-card";
//   import LogOutIcon from "@lucide/svelte/icons/log-out";
//   import SparklesIcon from "@lucide/svelte/icons/sparkles";
//   import * as Avatar from "$lib/components/ui/avatar/index.js";
//   import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
//   import { useSidebar } from "$lib/components/ui/sidebar/index.js";
//   import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { CloudIcon, TrashIcon } from "@lucide/svelte";
  import Progress from "../ui/progress/progress.svelte";

//   const user = $derived(page.data?.user);
//   const sidebar = useSidebar();
</script>

<Sidebar.Group>
  <Sidebar.GroupContent>
    <Sidebar.Menu class="flex flex-col gap-2">
      <!-- Trash -->
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>
          {#snippet child({ props })}
            <a href="/trash" {...props}>
              <TrashIcon />
              <span>Trash</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>

      <Sidebar.Separator />

      <!-- Storage Info -->
      <Sidebar.MenuItem class="flex flex-col gap-2 mt-2">
        <div class="flex gap-2">
          <CloudIcon class="size-5" />
          <span class="text-sm font-medium">Storage Used</span>
        </div>
        <Progress value={20} max={1000} class="h-1 mt-1 mb-0.5" />
        <span class="text-xs text-muted-foreground"> 20 / 1000 MB </span>
      </Sidebar.MenuItem>

      <!-- <Sidebar.Separator /> -->

      <!-- User -->
      <!-- <Sidebar.MenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Sidebar.MenuButton
                {...props}
                size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar.Root class="size-8 rounded-lg">
                  <Avatar.Fallback class="rounded-lg">
                    {user?.email.charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">{user?.email}</span>
                  <span class="truncate text-xs text-muted-foreground"
                    >{user?.id}</span
                  >
                </div>
                <ChevronsUpDownIcon class="ml-auto size-4" />
              </Sidebar.MenuButton>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
            side={sidebar.isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenu.Label class="p-0 font-normal">
              <div
                class="flex items-center gap-2 px-1 py-1.5 text-left text-sm"
              >
                <Avatar.Root class="size-8 rounded-lg">
                  <Avatar.Fallback class="rounded-lg">
                    {user?.email.charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">{user?.email}</span>
                  <span class="truncate text-xs text-muted-foreground"
                    >{user?.id}</span
                  >
                </div>
              </div>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.Item>
                <SparklesIcon />
                Upgrade to Pro
              </DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.Item>
                <BadgeCheckIcon />
                Account
              </DropdownMenu.Item>
              <DropdownMenu.Item>
                <CreditCardIcon />
                Billing
              </DropdownMenu.Item>
              <DropdownMenu.Item>
                <BellIcon />
                Notifications
              </DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.Item>
              <LogOutIcon />
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Sidebar.MenuItem> -->
    </Sidebar.Menu>
  </Sidebar.GroupContent>
</Sidebar.Group>
