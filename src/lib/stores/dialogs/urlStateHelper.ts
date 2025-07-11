import { pushState, replaceState } from "$app/navigation";
import { browser } from "$app/environment";
import { page } from "$app/state";
import type { FileItem } from "$lib/types/file.js";

export interface UrlStateConfig {
  paramName: string;
  stateName: string;
  indexParam?: string;
}

export function createUrlStateManager(config: UrlStateConfig) {
  const { paramName, stateName, indexParam } = config;

  function pushUrlState(fileId: string, additionalData?: Record<string, any>) {
    if (!browser) return;

    const url = new URL(page.url);
    url.searchParams.set(paramName, fileId);

    if (indexParam && additionalData?.currentIndex !== undefined) {
      url.searchParams.set(indexParam, additionalData.currentIndex.toString());
    }

    pushState(url.toString(), {
      [stateName]: {
        fileId,
        ...additionalData,
      },
    });
  }

  function replaceUrlState(
    fileId: string,
    additionalData?: Record<string, any>
  ) {
    if (!browser) return;

    const url = new URL(page.url);
    url.searchParams.set(paramName, fileId);

    if (indexParam && additionalData?.currentIndex !== undefined) {
      url.searchParams.set(indexParam, additionalData.currentIndex.toString());
    }

    replaceState(url.toString(), {
      [stateName]: {
        fileId,
        ...additionalData,
      },
    });
  }

  function clearUrlState() {
    if (!browser) return;

    const url = new URL(page.url);
    url.searchParams.delete(paramName);
    if (indexParam) {
      url.searchParams.delete(indexParam);
    }
    replaceState(url.toString(), {});
  }

  function getFileIdFromUrl(): string | null {
    if (!browser) return null;

    const pageUrl = page.url;
    const windowUrl = new URL(window.location.href);

    const pageFileId = pageUrl.searchParams.get(paramName);
    const windowFileId = windowUrl.searchParams.get(paramName);

    return pageFileId || windowFileId;
  }

  function getIndexFromUrl(): number | null {
    if (!browser || !indexParam) return null;

    const windowUrl = new URL(window.location.href);
    const indexStr = windowUrl.searchParams.get(indexParam);
    return indexStr ? parseInt(indexStr, 10) : null;
  }

  function findFileById(
    fileId: string,
    fileList: FileItem[]
  ): FileItem | undefined {
    return fileList.find((f) => f.id === fileId);
  }

  return {
    pushUrlState,
    replaceUrlState,
    clearUrlState,
    getFileIdFromUrl,
    getIndexFromUrl,
    findFileById,
  };
}
