/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (
  /** @type {unknown} */ (self)
);

import { build, files, prerendered, version } from "$service-worker";

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

sw.addEventListener("install", (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    console.log("Installing service worker, caching assets...");
    try {
      await cache.addAll(ASSETS);
      console.log("Successfully cached all assets");
    } catch (error) {
      console.error("Failed to cache assets:", error);
    }
  }

  event.waitUntil(addFilesToCache());

  if (sw.registration.active) {
    sw.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "update-available" });
      });
    });
  }
});

sw.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    const cacheKeepList = [CACHE];
    const keyList = await caches.keys();
    const cachesToDelete = keyList.filter(
      (key) => !cacheKeepList.includes(key)
    );

    return Promise.all(cachesToDelete.map((key) => caches.delete(key)));
  }

  event.waitUntil(deleteOldCaches());
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener("message", async (event) => {
  if (event.data.type === "skip-waiting") {
    sw.skipWaiting();

    const clients = await sw.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage({ type: "sw-updated" });
    });

    return;
  }
});

sw.addEventListener("statechange", () => {
  if (sw.state === "installed" && sw.registration.active) {
    sw.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "update-available" });
      });
    });
  }
});
