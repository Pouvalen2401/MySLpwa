const CACHE_NAME = 'signspeak-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/screens/home.html',
  '/screens/translate.html',
  '/screens/avatar-customization.html',
  '/screens/settings.html',
  '/screens/profile.html',
  '/css/main.css',
  '/css/home.css',
  '/css/avatar.css',
  '/css/translation.css',
  '/css/settings.css',
  '/js/app.js',
  '/js/camera-handler.js',
  '/js/hand-detection.js',
  '/js/face-detection.js',
  '/js/mood-detection.js',
  '/js/avatar-manager.js',
  '/js/avatar-animator.js',
  '/js/translation-engine.js',
  '/js/storage-manager.js',
  '/js/settings-manager.js',
  '/js/utils.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});