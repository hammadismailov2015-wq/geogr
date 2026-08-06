/* Сервис-воркер шахмат: установка как приложение + работа офлайн.
   Стратегия «сначала сеть» — онлайн всегда свежая версия, офлайн — из кэша. */
const CACHE = 'chess-app-v9';
const CORE = [
  'chess.html', 'chess.css', 'chess.js', 'chess-ui.js', 'mqtt.min.js',
  'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'
];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== location.origin) return; // сторонние (брокер и т.п.) не трогаем
  e.respondWith(
    fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('chess.html')))
  );
});
