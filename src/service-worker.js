/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (
  /** @type {unknown} */ (self)
);

import { build, files, prerendered, version } from "$service-worker";

const CACHE = `cache-${version}`;
const RUNTIME_CACHE = `runtime-${version}`;
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
    const cacheKeepList = [CACHE, RUNTIME_CACHE];
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

sw.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.origin !== location.origin) return;

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
