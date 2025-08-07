<script lang="ts">
  import { page } from "$app/state";
  import Error from "$lib/components/shared/Error.svelte";
  
  const messages = $derived(page.error?.message.split("\n") ?? []);
</script>

<svelte:head>
  <title>Error {page.status}</title>
</svelte:head>

<Error {messages} status={page.status} />