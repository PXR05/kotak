<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import UploadButton from "./UploadButton.svelte";
  import User from "./User.svelte";
</script>

<Sidebar.Menu class="flex flex-col gap-4">
  <User />
  <UploadButton />
</Sidebar.Menu>
