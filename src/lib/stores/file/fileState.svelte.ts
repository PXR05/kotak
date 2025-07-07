import type { FileItem } from "$lib/types/file.js";

/**
 * Core file management state
 */
export let selectedItems = $state<FileItem[]>([]);
export let lastSelectedIndex = $state<{ value: number | null }>({
  value: null,
});
export let currentFolderId = $state<{ value: string | null }>({ value: null });
export let currentUserId = $state<{ value: string | null }>({ value: null });

/**
 * Operation states
 */
export let isUploading = $state({ value: false });
export let isDownloading = $state({ value: false });
export let uploadProgress = $state<{ [key: string]: number }>({});

/**
 * Selection management utilities
 */
export const selectionUtils = {
  selectAll(items: FileItem[]) {
    selectedItems.splice(0, selectedItems.length, ...items);
    lastSelectedIndex.value = items.length > 0 ? items.length - 1 : null;
  },

  clearSelection() {
    selectedItems.length = 0;
    lastSelectedIndex.value = null;
  },

  removeFromSelection(item: FileItem) {
    const index = selectedItems.findIndex(
      (selected) => selected.id === item.id
    );
    if (index > -1) {
      selectedItems.splice(index, 1);
    }
  },

  isSelected(item: FileItem): boolean {
    return selectedItems.some((selected) => selected.id === item.id);
  },

  toggleSelection(item: FileItem) {
    if (this.isSelected(item)) {
      this.removeFromSelection(item);
    } else {
      selectedItems.push(item);
    }
  },
};

/**
 * Context management utilities
 */
export const contextUtils = {
  setCurrentFolder(folderId: string | null) {
    currentFolderId.value = folderId;
  },

  setCurrentUser(userId: string | null) {
    currentUserId.value = userId;
  },
};
