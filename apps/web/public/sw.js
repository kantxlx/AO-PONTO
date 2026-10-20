const CACHE = "ao-ponto-v3";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", "/index.html"])),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("ao-ponto-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_ASSETS" && Array.isArray(event.data.paths))
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) =>
          cache.addAll([
            ...event.data.paths.filter(
              (p) =>
                typeof p === "string" &&
                (p.startsWith("/assets/") || p.startsWith("/images/")),
            ),
            "/api/cuts",
            "/api/status",
          ]),
        ),
    );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || event.request.method !== "GET") return;
  const publicApi = ["/api/cuts", "/api/status"].includes(url.pathname);
  if (url.pathname.startsWith("/api/") && !publicApi) return;
  if (
    !publicApi &&
    event.request.mode !== "navigate" &&
    !url.pathname.startsWith("/assets/") &&
    !url.pathname.startsWith("/images/")
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate")
          return caches.match("/index.html");
        throw new Error("Recurso indisponível offline");
      }),
  );
});
