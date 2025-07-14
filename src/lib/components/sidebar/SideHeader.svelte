<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import UploadButton from "./UploadButton.svelte";
  import User from "./User.svelte";
</script>

<Sidebar.Menu class="flex flex-col gap-4">
  <User />
  <Sidebar.MenuItem class="px-2 max-md:hidden">
    <UploadButton />
  </Sidebar.MenuItem>
</Sidebar.Menu>
