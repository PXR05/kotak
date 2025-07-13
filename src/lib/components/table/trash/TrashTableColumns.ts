import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import type { TrashedItem } from "$lib/types/file.js";
import FileTableName from "../file/FileTableName.svelte";
import TrashTableActions from "./TrashTableActions.svelte";
import FileTableSortableHeader from "../file/FileTableSortableHeader.svelte";

export function createTrashTableColumns(
  onRestore: (item: TrashedItem) => void,
  onPermanentDelete: (item: TrashedItem) => void,
  onPreview: (item: TrashedItem) => void
): ColumnDef<TrashedItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Name",
        });
      },
      cell: ({ row }) => {
        const item = row.original;

        const fileItem = {
          id: item.itemId,
          name: item.name,
          type: item.type,
          ownerId: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          folderId: item.originalFolderId || undefined,
          parentId: item.originalParentId || undefined,
          mimeType: undefined,
          size: undefined,
          storageKey: undefined,
        };
        return renderComponent(FileTableName, {
          item: fileItem,
        });
      },
      enableSorting: true,
    },
    {
      accessorKey: "itemType",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Type",
        });
      },
      cell: ({ row }) => {
        const item = row.original;
        return item.type === "folder" ? "Folder" : "File";
      },
      enableSorting: true,
    },
    {
      accessorKey: "originalLocation",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Original Location",
        });
      },
      cell: ({ row }) => {
        const item = row.original;
        return item.originalFolderId || item.originalParentId;
      },
      enableSorting: true,
    },
    {
      accessorKey: "trashedAt",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Deleted At",
        });
      },
      cell: ({ row }) => {
        const item = row.original;
        return new Date(item.trashedAt).toLocaleDateString();
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      size: 60,
      maxSize: 60,
      cell: ({ row }) => {
        const item = row.original;
        return renderComponent(TrashTableActions, {
          item,
          onRestore,
          onPermanentDelete,
          onPreview,
        });
      },
    },
  ];
}
