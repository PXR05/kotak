import type { FileItem } from "$lib/types/file.js";
import { browser } from "$app/environment";
import { onGetFolderChildren } from "./fileAPI.telefunc";
import { toast } from "svelte-sonner";

export interface FileTreeNode {
  item: FileItem;
  children?: FileTreeNode[];
  expanded: boolean;
  loading: boolean;
  childrenLoaded: boolean;
}

export interface FileTreeState {
  nodes: FileTreeNode[];
  expandedFolders: Set<string>;
}

const STORAGE_KEY = "file-tree:expandedFolders";

function saveExpandedFolders(expandedFolders: Set<string>) {
  if (!browser) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(expandedFolders))
    );
  } catch (error) {
    console.warn("Failed to save file tree state:", error);
  }
}

function loadExpandedFolders(): Set<string> {
  if (!browser) return new Set();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const folderIds = JSON.parse(saved);
      return new Set(Array.isArray(folderIds) ? folderIds : []);
    }
  } catch (error) {
    console.warn("Failed to load file tree state:", error);
  }
  return new Set();
}

let fileTreeState = $state<FileTreeState>({
  nodes: [],
  expandedFolders: loadExpandedFolders(),
});

export const fileTree = {
  get nodes() {
    return fileTreeState.nodes;
  },

  get expandedFolders() {
    return fileTreeState.expandedFolders;
  },

  setRootItems(items: FileItem[]) {
    const currentItemIds = fileTreeState.nodes
      .map((node) => node.item.id)
      .sort();
    const newItemIds = items.map((item) => item.id).sort();

    if (
      currentItemIds.length === newItemIds.length &&
      currentItemIds.every((id, index) => id === newItemIds[index])
    ) {
      return;
    }

    fileTreeState.nodes = items.map((item) => ({
      item,
      expanded: fileTreeState.expandedFolders.has(item.id),
      loading: false,
      childrenLoaded: item.type === "file",
      children: item.type === "file" ? undefined : [],
    }));

    items.forEach((item) => {
      if (
        item.type === "folder" &&
        fileTreeState.expandedFolders.has(item.id)
      ) {
        const node = this.findNode(item.id);
        if (node && !node.childrenLoaded && !node.loading) {
          this.loadFolderChildren(item.id);
        }
      }
    });
  },

  toggleFolder(folderId: string) {
    if (fileTreeState.expandedFolders.has(folderId)) {
      fileTreeState.expandedFolders.delete(folderId);
      this.setFolderExpanded(folderId, false);
    } else {
      fileTreeState.expandedFolders.add(folderId);
      this.setFolderExpanded(folderId, true);

      const node = this.findNode(folderId);
      if (node && !node.childrenLoaded && !node.loading) {
        this.loadFolderChildren(folderId);
      }
    }
    saveExpandedFolders(fileTreeState.expandedFolders);
  },

  setFolderExpanded(folderId: string, expanded: boolean) {
    const node = this.findNode(folderId);
    if (node) {
      node.expanded = expanded;
      if (expanded) {
        fileTreeState.expandedFolders.add(folderId);
      } else {
        fileTreeState.expandedFolders.delete(folderId);
      }
      saveExpandedFolders(fileTreeState.expandedFolders);
    }
  },

  async loadFolderChildren(folderId: string) {
    const node = this.findNode(folderId);
    if (!node || node.loading || node.childrenLoaded) return;

    node.loading = true;

    try {
      const { data, error } = await onGetFolderChildren({
        folderId,
      });
      if (error || !data) {
        toast.error(
          `Failed to load folder children: ${error || "Unknown error"}`
        );
        return;
      }
      node.children = data.map((child) => ({
        item: child,
        expanded: fileTreeState.expandedFolders.has(child.id),
        loading: false,
        childrenLoaded: child.type === "file",
        children: child.type === "file" ? undefined : [],
      }));
      node.childrenLoaded = true;

      data.forEach((child) => {
        if (
          child.type === "folder" &&
          fileTreeState.expandedFolders.has(child.id)
        ) {
          setTimeout(() => {
            this.loadFolderChildren(child.id);
          }, 0);
        }
      });
    } catch (error) {
      console.error("Failed to load folder children:", error);
    } finally {
      node.loading = false;
    }
  },

  findNode(
    itemId: string,
    nodes: FileTreeNode[] = fileTreeState.nodes
  ): FileTreeNode | null {
    for (const node of nodes) {
      if (node.item.id === itemId) {
        return node;
      }
      if (node.children) {
        const found = this.findNode(itemId, node.children);
        if (found) return found;
      }
    }
    return null;
  },

  isExpanded(folderId: string): boolean {
    return fileTreeState.expandedFolders.has(folderId);
  },

  addItem(parentId: string | null, newItem: FileItem) {
    if (!parentId) {
      fileTreeState.nodes.push({
        item: newItem,
        expanded: false,
        loading: false,
        childrenLoaded: newItem.type === "file",
        children: newItem.type === "file" ? undefined : [],
      });
    } else {
      const parentNode = this.findNode(parentId);
      if (parentNode && parentNode.children) {
        parentNode.children.push({
          item: newItem,
          expanded: false,
          loading: false,
          childrenLoaded: newItem.type === "file",
          children: newItem.type === "file" ? undefined : [],
        });
      }
    }
  },

  removeItem(itemId: string) {
    const removeFromNodes = (nodes: FileTreeNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].item.id === itemId) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].children && removeFromNodes(nodes[i].children!)) {
          return true;
        }
      }
      return false;
    };

    removeFromNodes(fileTreeState.nodes);
    fileTreeState.expandedFolders.delete(itemId);
    saveExpandedFolders(fileTreeState.expandedFolders);
  },

  updateItem(itemId: string, updates: Partial<FileItem>) {
    const node = this.findNode(itemId);
    if (node) {
      node.item = { ...node.item, ...updates };
    }
  },

  refresh() {
    const resetNodes = (nodes: FileTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.item.type === "folder") {
          node.childrenLoaded = false;
          node.children = [];
          if (node.expanded) {
            this.loadFolderChildren(node.item.id);
          }
        }
        if (node.children) {
          resetNodes(node.children);
        }
      });
    };

    resetNodes(fileTreeState.nodes);
  },

  refreshFolder(folderId: string) {
    const node = this.findNode(folderId);
    if (node && node.item.type === "folder") {
      node.childrenLoaded = false;
      node.children = [];
      if (node.expanded) {
        this.loadFolderChildren(node.item.id);
      }
    }
  },

  clearPersistedState() {
    if (!browser) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      fileTreeState.expandedFolders.clear();
    } catch (error) {
      console.warn("Failed to clear file tree state:", error);
    }
  },
};
