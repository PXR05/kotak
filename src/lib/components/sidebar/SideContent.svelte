<script lang="ts">
  import { page } from "$app/state";

  const { items, currentFolder, currentFolderId, breadcrumbs } = $derived(
    page.data
  );
</script>

<!-- Sidebar File Tree -->
