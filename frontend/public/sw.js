// Killswitch: replaces the old vite-plugin-pwa service worker. Anyone with the previous SW
// still installed will pick this up on its own next update check, at which point it wipes every
// cache it made and unregisters itself — so their browser goes back to fetching everything
// straight from the network, same as someone who'd never had a service worker at all.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
