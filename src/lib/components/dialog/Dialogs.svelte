<script>
  import ConfirmationDialog from "./ConfirmationDialog.svelte";
  import CreateFolderDialog from "./CreateFolderDialog.svelte";
  import { FilePreviewDialog } from "./filepreview/index.js";
  import InfoDialog from "./InfoDialog.svelte";
  import RenameDialog from "./RenameDialog.svelte";
  import MoveDialog from "./MoveDialog.svelte";
  import ShareDialog from "./ShareDialog.svelte";
</script>

<FilePreviewDialog />

<InfoDialog />

<ConfirmationDialog />

<RenameDialog />

<CreateFolderDialog />

<MoveDialog />

<ShareDialog />
