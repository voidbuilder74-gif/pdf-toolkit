const CACHE_NAME = "pdf-toolkit-v2";
const ASSETS = ["/", "/index.html", "/style.css", "/app.js", "/icon-192.png", "/icon-512.png", "/manifest.json"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method === "GET" && !e.request.url.includes("/api/")) {
    e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
  }
});
