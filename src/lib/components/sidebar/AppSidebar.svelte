<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  import SideContent from "./SideContent.svelte";
  import SideFooter from "./SideFooter.svelte";
  import SideHeader from "./SideHeader.svelte";

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
  <Sidebar.Header>
    <SideHeader />
  </Sidebar.Header>
  <Sidebar.Content>
    <SideContent />
  </Sidebar.Content>
  <Sidebar.Footer>
    <SideFooter />
  </Sidebar.Footer>
</Sidebar.Root>
