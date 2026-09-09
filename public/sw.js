const C = "gp-cache-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== C).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  )
);
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(C).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }
  e.respondWith(
    caches.open(C).then(async (c) => {
      const cached = await c.match(req);
      const net = fetch(req)
        .then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || net;
    })
  );
});
