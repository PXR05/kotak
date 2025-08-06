<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLUListElement>> = $props();
</script>

<ul
  bind:this={ref}
  data-slot="sidebar-menu-sub"
  data-sidebar="menu-sub"
  class={cn(
    "border-sidebar-border ml-3 mr-0.5 flex min-w-0 translate-x-px flex-col gap-1 border-l pl-2.5 py-0.5",
    "group-data-[collapsible=icon]:hidden",
    className
  )}
  {...restProps}
>
  <span class="h-4.5 w-1 absolute -left-0.5 bottom-0 bg-sidebar"></span>
  <span
    class="group-not-last/ctx-trigger:hidden h-[calc(100%+1rem)] w-1 absolute -left-6.5 -top-4 bg-sidebar"
  ></span>
  {@render children?.()}
</ul>