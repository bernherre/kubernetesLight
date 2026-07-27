const CACHE = 'nederlands-gewoon-doen-v2';
const CORE = [
  './', './index.html', './css/styles.css', './js/app.js',
  './js/main.js', './js/learning.js', './js/content.js',
  './images/logo.svg', './images/concept-map.svg', './images/lesson-thuiswerken.svg',
  './images/woord-huis.svg', './images/woord-fiets.svg', './images/woord-appel.svg',
  './images/woord-kantoor.svg', './images/woord-trein.svg', './images/woord-huisarts.svg',
  './images/woord-school.svg', './images/woord-regen.svg', './images/woord-koffie.svg',
  './images/scene-school.svg', './images/scene-station.svg', './images/scene-meeting.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});
