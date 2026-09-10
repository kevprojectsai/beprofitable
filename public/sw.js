const C = "gp-cache-v3";
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

  const url = new URL(req.url);
  // NUNCA interceptar/cachear peticiones a otros dominios (Supabase u otras APIs):
  // deben ir siempre a la red para tener los datos más recientes y sincronizados.
  if (url.origin !== self.location.origin) return;

  // Navegación (HTML): red primero, con respaldo al caché si no hay conexión.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(C).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Assets del mismo origen (JS, CSS, íconos): stale-while-revalidate.
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
