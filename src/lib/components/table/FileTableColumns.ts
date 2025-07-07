import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import type { FileItem, FileAction } from "$lib/types/file.js";
import FileTableName from "./FileTableName.svelte";
import FileTableActions from "./FileTableActions.svelte";
import FileTableSortableHeader from "./FileTableSortableHeader.svelte";
import { formatFileSize } from "$lib/utils/format";

function getFileTypeFromMimeType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "Spreadsheet";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "Document";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "Presentation";
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed"
  )
    return "Archive";
  if (mimeType.startsWith("text/")) return "Text";
  return "File";
}

function getDisplayType(item: FileItem): string {
  if (item.type === "folder") return "Folder";
  if (!item.mimeType) return "File";
  return getFileTypeFromMimeType(item.mimeType);
}

export function createFileTableColumns(
  onAction: (action: FileAction, item: FileItem) => void
): ColumnDef<FileItem>[] {
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
        return renderComponent(FileTableName, {
          item,
        });
      },
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Type",
        });
      },
      cell: ({ row }) => {
        const item = row.original;
        return getDisplayType(item);
      },
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const a = getDisplayType(rowA.original);
        const b = getDisplayType(rowB.original);
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: "size",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Size",
        });
      },
      cell: ({ row }) => {
        const item = row.original;
        return item.type === "folder" ? "-" : formatFileSize(item.size || 0);
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original;
        const b = rowB.original;
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (b.type === "folder" && a.type !== "folder") return 1;
        if (a.type === "folder" && b.type === "folder") return 0;
        return (a.size || 0) - (b.size || 0);
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => {
        return renderComponent(FileTableSortableHeader, {
          column,
          title: "Modified",
        });
      },
      cell: ({ row }) => {
        const item = row.original;
        return new Date(item.updatedAt).toLocaleDateString();
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
        return renderComponent(FileTableActions, {
          item,
          onAction,
        });
      },
    },
  ];
}
