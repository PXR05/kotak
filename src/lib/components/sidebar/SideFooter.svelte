<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { formatFileSize } from "$lib/utils/format";
  import { CloudIcon, TrashIcon } from "@lucide/svelte";
  import Progress from "../ui/progress/progress.svelte";
</script>

<Sidebar.Group class="p-0">
  <Sidebar.GroupContent>
    <Sidebar.Menu class="flex flex-col gap-2">
      <Sidebar.MenuItem>
        <Sidebar.MenuButton data-active={page.url.pathname === "/trash"}>
          {#snippet child({ props })}
            <a href="/trash" {...props}>
              <TrashIcon />
              <span>Trash</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>

      <Sidebar.Separator />

      <Sidebar.MenuItem>
        <div class="flex flex-col gap-2 my-1 px-2">
          <div class="flex items-center gap-2">
            <CloudIcon class="size-4" />
            <span class="text-sm font-medium">Storage</span>
          </div>
          {#await page.data.storageStatus}
            <Progress
              value={50}
              max={100}
              class="h-1 mt-1 mb-0.5 animate-pulse"
            />
            <span class="text-xs text-muted-foreground animate-pulse">
              Loading storage...
            </span>
          {:then status}
            <Progress
              value={status?.total - status?.free}
              max={status?.total}
              class="h-1 mt-1 mb-0.5"
            />
            <span class="text-xs text-muted-foreground">
              {formatFileSize((status?.total ?? 0) - (status?.free ?? 0))}
              / {formatFileSize(status?.total ?? 0)} ({formatFileSize(
                status?.used ?? 0
              )} used)
            </span>
          {/await}
        </div>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.GroupContent>
</Sidebar.Group>
