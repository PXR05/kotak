<script lang="ts">
  let { data } = $props();
</script>

{#if data.user}
  <p>Welcome, {data.user.email}!</p>
{/if}
