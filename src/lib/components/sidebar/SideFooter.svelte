<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { formatFileSize } from "$lib/utils/format";
  import { CloudIcon, TrashIcon } from "@lucide/svelte";
  import Progress from "../ui/progress/progress.svelte";
  import { Tween } from "svelte/motion";
  import { quintInOut } from "svelte/easing";
  import { onMount } from "svelte";

  let loading = $state(true);
  let status = $state<{ total: number; free: number; used: number } | null>(
    null
  );
  let progress = new Tween(0, {
    duration: 250,
  });

  $effect(() => {
    page.data.storageStatus.then((s: any) => {
      status = s;
      progress.target = (status?.total ?? 0) - (status?.free ?? 0);
      loading = false;
    });
  });
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
          {#if loading}
            <Progress
              value={progress.current}
              max={100}
              class="h-1 mt-1 mb-0.5 animate-pulse"
            />
            <span class="text-xs text-muted-foreground animate-pulse">
              Loading storage...
            </span>
          {:else}
            <Progress
              value={progress.current}
              max={status?.total ?? 0}
              class="h-1 mt-1 mb-0.5"
            />
            <span class="text-xs text-muted-foreground">
              {formatFileSize((status?.total ?? 0) - (status?.free ?? 0))} /
              {formatFileSize(status?.total ?? 0)} (
              {formatFileSize(status?.used ?? 0)} used)
            </span>
          {/if}
        </div>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.GroupContent>
</Sidebar.Group>
