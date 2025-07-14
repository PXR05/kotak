import { selectedItems, currentFolderId, fileOperations } from "$lib/stores";
import type { FileItem } from "$lib/types/file.js";

export function createDragState() {
  let isDragging = $state(false);
  let isDropTarget = $state(false);
  let dragCounter = $state(0);

  return {
    get isDragging() {
      return isDragging;
    },
    get isDropTarget() {
      return isDropTarget;
    },
    get dragCounter() {
      return dragCounter;
    },
    set isDragging(value: boolean) {
      isDragging = value;
    },
    set isDropTarget(value: boolean) {
      isDropTarget = value;
    },
    set dragCounter(value: number) {
      dragCounter = value;
    },
    reset() {
      isDragging = false;
      isDropTarget = false;
      dragCounter = 0;
    },
  };
}

export function createDragData(items: FileItem[]) {
  return {
    type: "file-move",
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
    })),
  };
}

function getThemeColors() {
  const element = document.createElement("div");
  element.className =
    "bg-sidebar text-sidebar-foreground border-sidebar-border";
  element.style.cssText =
    "position: absolute; top: -1000px; visibility: hidden;";
  document.body.appendChild(element);

  const style = getComputedStyle(element);
  const colors = {
    backgroundColor: style.backgroundColor,
    textColor: style.color,
    borderColor: style.borderColor,
  };

  document.body.removeChild(element);
  return colors;
}

function createCanvasDragImage(
  text: string,
  colors: ReturnType<typeof getThemeColors>
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const padding = 16;
  const fontSize = 16;
  const borderRadius = 8;
  const font = "500 16px ui-sans-serif, system-ui, sans-serif";

  ctx.font = font;
  const width = ctx.measureText(text).width + padding * 2;
  const height = fontSize + padding * 2;

  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText =
    "position: fixed; top: -200px; left: -200px; pointer-events: none; z-index: 9999;";

  ctx.fillStyle = colors.backgroundColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, borderRadius);
  ctx.fill();

  ctx.strokeStyle = colors.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, borderRadius);
  ctx.stroke();

  ctx.fillStyle = colors.textColor;
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, padding, height / 2);

  return canvas;
}

function createFallbackDragImage(text: string) {
  const element = document.createElement("div");
  element.textContent = text;
  element.className =
    "px-4 py-3 bg-sidebar text-sidebar-foreground border-sidebar-border rounded-lg text-sm shadow-lg";
  element.style.cssText =
    "position: fixed; top: -200px; left: -200px; white-space: nowrap; pointer-events: none; z-index: 9999;";
  return element;
}

export function createDragImage(text: string) {
  const colors = getThemeColors();
  const dragImage =
    createCanvasDragImage(text, colors) || createFallbackDragImage(text);

  document.body.appendChild(dragImage);
  setTimeout(
    () =>
      document.body.contains(dragImage) && document.body.removeChild(dragImage),
    100
  );

  return dragImage;
}

export function isInternalMove(dataTransfer: DataTransfer | null) {
  return (
    dataTransfer?.types.includes("text/plain") &&
    !dataTransfer.types.includes("Files")
  );
}

export function isCurrentFolder(folderId: string) {
  return folderId === currentFolderId.value;
}

export function handleDragStart(
  dragState: ReturnType<typeof createDragState>,
  item: FileItem,
  e: DragEvent
) {
  dragState.isDragging = true;

  if (!selectedItems.some((selected) => selected.id === item.id)) {
    selectedItems.length = 0;
    selectedItems.push(item);
  }

  const dragData = createDragData(selectedItems);
  const text =
    selectedItems.length === 1
      ? `Moving "${selectedItems[0].name}"`
      : `Moving ${selectedItems.length} items`;

  if (e.dataTransfer) {
    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(createDragImage(text), 10, 10);
  }
}

export function handleDragEnd(dragState: ReturnType<typeof createDragState>) {
  dragState.reset();
}

export function handleDropZoneDragEnter(
  dragState: ReturnType<typeof createDragState>,
  targetId: string,
  e: DragEvent
) {
  e.preventDefault();
  e.stopPropagation();

  if (!isInternalMove(e.dataTransfer) || isCurrentFolder(targetId)) return;

  dragState.dragCounter++;
  if (dragState.dragCounter === 1) {
    dragState.isDropTarget = true;
  }
}

export function handleDropZoneDragOver(targetId: string, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (!isInternalMove(e.dataTransfer) || isCurrentFolder(targetId)) {
    if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    return;
  }

  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
}

export function handleDropZoneDragLeave(
  dragState: ReturnType<typeof createDragState>,
  targetId: string,
  e: DragEvent
) {
  e.preventDefault();
  e.stopPropagation();

  if (!isInternalMove(e.dataTransfer) || isCurrentFolder(targetId)) return;

  dragState.dragCounter--;
  if (dragState.dragCounter === 0) {
    dragState.isDropTarget = false;
  }
}

export async function handleDropZoneDrop(
  dragState: ReturnType<typeof createDragState>,
  targetId: string,
  e: DragEvent
) {
  e.preventDefault();
  e.stopPropagation();
  dragState.reset();

  try {
    const dragData = e.dataTransfer?.getData("text/plain");
    if (!dragData) return;

    const parsedData = JSON.parse(dragData);
    if (parsedData.type !== "file-move") return;

    const draggedItems = parsedData.items;
    if (draggedItems.some((item: any) => item.id === targetId)) return;

    const itemsToMove = selectedItems.filter((item) =>
      draggedItems.some((draggedItem: any) => draggedItem.id === item.id)
    );

    if (itemsToMove.length > 0) {
      await fileOperations.moveItems(itemsToMove, targetId);
      selectedItems.length = 0;
    }
  } catch (error) {
    console.error("Error handling drop:", error);
  }
}

export function createGlobalDragHandlers(
  dragState: ReturnType<typeof createDragState>
) {
  return {
    handleGlobalDragEnd: () => dragState.reset(),
    handleGlobalDragLeave: (e: DragEvent) => {
      if (
        e.clientX < 0 ||
        e.clientY < 0 ||
        e.clientX > window.innerWidth ||
        e.clientY > window.innerHeight
      ) {
        dragState.reset();
      }
    },
  };
}
