// Define o nome do cache
const CACHE_NAME = 'english-teacher-chatbot-cache-v1';

// Lista de arquivos para cachear durante a instalação
const urlsToCache = [
  './', // Cache the root (index.html)
  './index.html',
  './manifest.json',
  './icons/icon-512.png', // Agora referenciando o seu icon-512.png
  // Note: External scripts like Botpress URLs are typically not cached by your service worker
  // as they are managed by their respective CDNs.
];

// Evento de instalação: abre um cache e adiciona todos os arquivos listados
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Força o novo Service Worker a ativar imediatamente
  );
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Permite que o Service Worker controle imediatamente os clientes existentes
  );
});

// Evento de fetch: intercepta requisições e serve do cache se disponível
self.addEventListener('fetch', (event) => {
  // Ignora requisições de extensão e URLs externas (como os scripts do Botpress)
  if (event.request.url.startsWith('chrome-extension://') || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna a resposta do cache se encontrada
        if (response) {
          return response;
        }
        // Se não estiver no cache, faz a requisição à rede
        return fetch(event.request)
          .then((response) => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Clona a resposta para que ela possa ser usada pelo navegador e pelo cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch((error) => {
            console.error('Falha no fetch:', event.request.url, error);
            // Você pode adicionar um fallback para páginas offline aqui
            // Por exemplo, retornar uma página offline padrão se o fetch falhar
            // return caches.match('/offline.html');
          });
      })
  );
});
