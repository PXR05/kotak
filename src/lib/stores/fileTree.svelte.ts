import type { FileItem } from "$lib/types/file.js";

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

let fileTreeState = $state<FileTreeState>({
  nodes: [],
  expandedFolders: new Set(),
});

export const fileTree = {
  get nodes() {
    return fileTreeState.nodes;
  },

  get expandedFolders() {
    return fileTreeState.expandedFolders;
  },

  setRootItems(items: FileItem[]) {
    fileTreeState.nodes = items.map((item) => ({
      item,
      expanded: false,
      loading: false,
      childrenLoaded: item.type === "file",
      children: item.type === "file" ? undefined : [],
    }));
  },

  toggleFolder(folderId: string) {
    if (fileTreeState.expandedFolders.has(folderId)) {
      fileTreeState.expandedFolders.delete(folderId);
      this.setFolderExpanded(folderId, false);
    } else {
      fileTreeState.expandedFolders.add(folderId);
      this.setFolderExpanded(folderId, true);

      // Load children if not loaded yet
      const node = this.findNode(folderId);
      if (node && !node.childrenLoaded && !node.loading) {
        this.loadFolderChildren(folderId);
      }
    }
  },

  setFolderExpanded(folderId: string, expanded: boolean) {
    const node = this.findNode(folderId);
    if (node) {
      node.expanded = expanded;
    }
  },

  async loadFolderChildren(folderId: string) {
    const node = this.findNode(folderId);
    if (!node || node.loading || node.childrenLoaded) return;

    node.loading = true;

    try {
      const response = await fetch(`/api/folders/${folderId}/children`);
      if (response.ok) {
        const children: FileItem[] = await response.json();
        node.children = children.map((child) => ({
          item: child,
          expanded: false,
          loading: false,
          childrenLoaded: child.type === "file",
          children: child.type === "file" ? undefined : [],
        }));
        node.childrenLoaded = true;
      }
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
};
