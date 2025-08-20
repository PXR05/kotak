<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from "@lucide/svelte";

  let {
    column,
    title,
  }: {
    column: any;
    title: string;
  } = $props();

  function handleSort() {
    column.toggleSorting(column.getIsSorted() === "asc");
  }

  let sortDirection = $derived(column.getIsSorted());
  let canSort = $derived(column.getCanSort());
</script>

{#if canSort}
  <Button
    variant="ghost"
    size="sm"
    class="-ml-3 h-8 data-[state=open]:bg-accent"
    onclick={handleSort}
  >
    <span>{title}</span>
    {#if sortDirection === "desc"}
      <ChevronDownIcon class="ml-2 h-4 w-4" />
    {:else if sortDirection === "asc"}
      <ChevronUpIcon class="ml-2 h-4 w-4" />
    {:else}
      <ChevronsUpDownIcon class="ml-2 h-4 w-4" />
    {/if}
  </Button>
{:else}
  <span>{title}</span>
{/if}
