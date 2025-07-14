<script lang="ts">
  import {
    SearchIcon,
    XIcon,
    FileIcon,
    FolderIcon,
    LoaderIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import Input from "../ui/input/input.svelte";
  import { quintOut } from "svelte/easing";
  import { scale, slide } from "svelte/transition";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onDestroy, onMount } from "svelte";
  import { fileOperations } from "$lib/stores";
  import { formatFileSize } from "$lib/utils/format";
  import { onSearch } from "$lib/telefunc/search.telefunc";
  import { toast } from "svelte-sonner";

  const { alwaysOpen = false }: { alwaysOpen?: boolean } = $props();

  type SearchResult = {
    id: string;
    name: string;
    type: "file" | "folder";
    ownerId: string;
    storageKey?: string;
    folderId?: string;
    parentId?: string;
    size?: number;
    mimeType?: string;
    createdAt: Date;
    updatedAt: Date;
  };

  let searchOpen = $state(alwaysOpen);
  let searchInput: HTMLInputElement | null = $state(null);
  let searchValue = $state("");
  let searchResults = $state<SearchResult[]>([]);
  let isSearching = $state(false);
  let hasSearched = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let selectedIndex = $state(-1);
  let searchResultsContainer: HTMLDivElement | null = $state(null);
  let resultElements: HTMLDivElement[] = $state([]);

  onMount(() => {
    const urlSearchValue = page.url.searchParams.get("s") || "";
    if (urlSearchValue) {
      searchValue = urlSearchValue;
      debouncedSearch(urlSearchValue);
    }
  });

  async function performSearch(query: string) {
    if (!query.trim()) {
      searchResults = [];
      resultElements = [];
      isSearching = false;
      hasSearched = false;
      selectedIndex = -1;
      return;
    }

    isSearching = true;
    hasSearched = true;
    selectedIndex = -1;
    const { data, error } = await onSearch({ query, limit: 10 });
    if (error || !data) {
      toast.error(`Search failed: ${error ?? "Unknown error"}`);
      searchResults = [];
      resultElements = [];
    } else {
      searchResults = data.results;
      resultElements = new Array(data.results.length);
    }
    isSearching = false;
  }

  function debouncedSearch(query: string) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      searchResults = [];
      resultElements = [];
      isSearching = false;
      hasSearched = false;
      selectedIndex = -1;
      return;
    }

    hasSearched = false;
    selectedIndex = -1;
    searchTimeout = setTimeout(() => performSearch(query), 200);
  }

  onDestroy(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === "k") {
        event.preventDefault();
        searchOpen = !searchOpen;
        setTimeout(() => {
          if (searchOpen) {
            searchInput?.focus();
          } else if (searchInput) {
            clearInput();
            searchInput.blur();
          }
        }, 0);
      }
    }
    if (event.key === "Escape" && searchOpen && !alwaysOpen) {
      searchOpen = false;
      if (searchInput) {
        clearInput();
        searchInput.blur();
      }
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent) {
    if (!searchOpen || searchResults.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectedIndex =
          selectedIndex < searchResults.length - 1 ? selectedIndex + 1 : 0;
        scrollToSelectedResult();
        break;
      case "ArrowUp":
        event.preventDefault();
        selectedIndex =
          selectedIndex > 0 ? selectedIndex - 1 : searchResults.length - 1;
        scrollToSelectedResult();
        break;
      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        selectedIndex = -1;
        if (!alwaysOpen) {
          searchOpen = false;
          if (searchInput) {
            clearInput();
            searchInput.blur();
          }
        }
        break;
    }
  }

  function scrollToSelectedResult() {
    if (
      selectedIndex >= 0 &&
      selectedIndex < resultElements.length &&
      searchResultsContainer
    ) {
      const selectedElement = resultElements[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }

  function handleSearchToggle() {
    if (alwaysOpen && searchOpen) return;
    searchOpen = !searchOpen;
    setTimeout(() => {
      if (searchOpen) {
        searchInput?.focus();
      } else if (searchInput) {
        clearInput();
        searchInput.blur();
      }
    }, 0);
  }

  function clearInput(redirect = true) {
    searchValue = "";
    searchResults = [];
    resultElements = [];
    isSearching = false;
    hasSearched = false;
    selectedIndex = -1;

    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }

    if (redirect) {
      goto("?", {
        replaceState: true,
        keepFocus: true,
        noScroll: true,
      });
    }
  }

  function handleInput(
    e: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    }
  ) {
    const value = e.currentTarget.value;
    searchValue = value;
    selectedIndex = -1;

    goto(`?s=${encodeURIComponent(value)}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });

    debouncedSearch(value);
  }

  function handleResultClick(result: SearchResult) {
    fileOperations.handleItemClick(result);
    setTimeout(() => {
      if (!alwaysOpen) {
        searchOpen = false;
      }
      if (searchInput) {
        clearInput(false);
        searchInput.blur();
      }
    }, 0);
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="relative z-20 flex flex-col flex-1 md:max-w-1/2">
  <div class="flex items-center justify-end z-50">
    {#if searchOpen}
      <div
        class="w-full"
        transition:slide={{ axis: "x", duration: 150, easing: quintOut }}
      >
        <Input
          bind:ref={searchInput}
          value={searchValue}
          oninput={handleInput}
          onkeydown={handleSearchKeyDown}
          type="search"
          placeholder="Search files and folders..."
          aria-label="Search files and folders"
          class="w-full max-md:h-12 focus-visible:border-border focus-visible:dark:border-input focus-visible:ring-0
          {searchValue.trim() === '' ? '' : 'border-r-0 rounded-r-none'}
          {searchResults.length > 0 ||
          isSearching ||
          (hasSearched && searchValue.trim())
            ? 'rounded-b-none !border-b-transparent'
            : ''}"
        />
      </div>
    {/if}
    <Button
      variant="outline"
      size="icon"
      class="grid place-items-center max-md:size-12 
      {searchValue.trim() === '' ? 'max-md:hidden' : ''}
      {searchOpen ? 'rounded-l-none !border-l-transparent' : ''}
      {searchResults.length > 0 ||
      isSearching ||
      (hasSearched && searchValue.trim())
        ? 'rounded-b-none !border-b-transparent'
        : ''}"
      onclick={handleSearchToggle}
    >
      {#if searchOpen}
        <div
          transition:scale={{
            duration: 150,
            delay: 100,
            start: 0.5,
            easing: quintOut,
          }}
          class="row-[1/1] col-[1/1]"
        >
          <XIcon class="size-4" />
        </div>
      {:else}
        <div
          transition:scale={{
            duration: 150,
            delay: 100,
            start: 0.5,
            easing: quintOut,
          }}
          class="row-[1/1] col-[1/1]"
        >
          <SearchIcon class="size-4" />
        </div>
      {/if}
      <span class="sr-only">Search</span>
    </Button>
  </div>
  {#if searchOpen && (searchResults.length > 0 || isSearching || (hasSearched && searchValue.trim()))}
    <div
      bind:this={searchResultsContainer}
      class="absolute top-9 left-0 right-0 bg-sidebar shadow-md rounded-b-lg border border-input max-h-80 overflow-y-auto z-40 max-md:top-12"
      transition:slide={{ axis: "y", duration: 150, easing: quintOut }}
    >
      {#if isSearching}
        <div
          class="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2 dark:bg-input/30"
        >
          <LoaderIcon class="size-4 animate-spin" />
          Searching...
        </div>
      {:else if searchResults.length > 0}
        <div>
          {#each searchResults as result, index}
            <div bind:this={resultElements[index]}>
              <Button
                variant="ghost"
                class="text-left text-sm w-full justify-start h-auto px-4 py-2 rounded-none dark:bg-input/30 dark:hover:bg-input/50
                transition-none
                {index === selectedIndex ? 'bg-accent dark:bg-input/50 ' : ''}"
                onclick={() => handleResultClick(result)}
              >
                <div class="flex items-center gap-3">
                  <div class="flex-shrink-0">
                    {#if result.type === "file"}
                      <FileIcon class="size-4" />
                    {:else}
                      <FolderIcon class="size-4" />
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">
                      {result.name}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {result.type === "file" ? "File" : "Folder"}
                      {#if result.type === "file" && result.size}
                        • {formatFileSize(result.size)}
                      {/if}
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          {/each}
        </div>
      {:else if hasSearched && searchValue.trim()}
        <div class="px-4 py-3 text-sm text-muted-foreground dark:bg-input/30">
          No results found for "{searchValue}"
        </div>
      {/if}
    </div>
  {/if}
</div>
