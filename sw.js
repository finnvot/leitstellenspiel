
"use strict";

const CACHE_NAME = "VEYRO-v2";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, copy);
                    });

                    return response;
                })
                .catch(() => caches.match(event.request))
        );

        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
