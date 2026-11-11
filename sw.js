// Meus Gastos — service worker
// HTML: rede primeiro (pega sempre a versão nova do GitHub quando há internet), cache se estiver offline.
// Demais arquivos: cache primeiro, atualizando em segundo plano.
const CACHE = "meus-gastos-v7";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(url.pathname, {cache: "no-cache", credentials: "same-origin"}), timeout(4000)]);
        if (res && res.ok) { const c = await caches.open(CACHE); c.put("./index.html", res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match("./index.html")) || (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
