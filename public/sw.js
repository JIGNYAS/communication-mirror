const CACHE = "mirror-shell-v3";
const SHELL = ["/", "/diagnostic", "/review", "/history", "/coach", "/calibration", "/gym", "/more", "/manifest.webmanifest", "/mirror-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell());
  self.skipWaiting();
});

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const assets = new Set(SHELL);
  await Promise.allSettled(SHELL.map(async (url) => {
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok) return;
    await cache.put(url, response.clone());
    if (response.headers.get("content-type")?.includes("text/html")) {
      const html = await response.text();
      for (const match of html.matchAll(/\/_next\/static\/[^"'<> ]+/g)) assets.add(match[0]);
    }
  }));
  await Promise.allSettled([...assets].map((url) => cache.add(url)));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});
