/* Service worker: делает приложение устанавливаемым и работающим офлайн.
   Стратегия «сеть в первую очередь»: онлайн — всегда свежее, офлайн — из кэша. */
"use strict";

const CACHE = "geo-trainer-2024-12";
const CORE = [
  "./index.html",
  "./styles.css",
  "./data.js",
  "./pics.js",
  "./app.js",
  "./map.js",
  "./route.js",
  "./worldmap.svg",
  "./icon-geo-192.png",
  "./icon-geo-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
