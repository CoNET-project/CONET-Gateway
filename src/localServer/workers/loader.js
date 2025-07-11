"use strict";
const sw = self;

// 快取名稱仍然有用，但主要是為了快取 loader.html 本身或之後的動態內容
const CACHE_NAME = 'SilentPassVPN-loader-cache-v1';

// 預快取的內容大幅減少，甚至可以只快取 loader.html
// 這裡我們假設 loader.html 就是根目錄 '/'
const LOADER_URLS = ['/loader.html','loader.js']; // 或 '/'

// install 事件：只快取加載器本身
sw.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching loader shell');
            return cache.addAll(LOADER_URLS);
        }).then(() => sw.skipWaiting()) // 強制新的 SW 立即取代舊的
    );
});

// activate 事件：清理舊快取並立即控制頁面
sw.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => sw.clients.claim()) // 立即控制所有客戶端
    );
});

// --- 核心邏輯 ---

// 判斷請求是否為 React App 的一部分
const isReactAppResource = (req) => {
    const url = new URL(req.url);
    // 攔截對 index.html 的請求以及所有 /static/ 路徑下的 JS 和 CSS
    return url.pathname === '/index.html' || 
           url.pathname.startsWith('/static/') ||
           url.pathname === '/manifest.json' ||
           url.pathname === '/service-worker.js' ||
           url.pathname === '/favicon.ico';
           
};

const forwardToNode = (req) => {
    const urlObj = new URL(req.url);
    const _targetUrl = `http://localhost:3000${urlObj.pathname}`;
    // ... 複製 headers 和 body ...
    const newRequest = new Request(_targetUrl, {method: req.method, headers: req.headers, body: req.body, redirect: 'manual'});
    console.log(`[SW] Forwarding ${req.url} to a node.`);
    return fetch(newRequest);
};


// fetch 事件：攔截並轉發 React App 請求
sw.addEventListener('fetch', (event) => {
    const { request } = event;

    // 如果是 React 應用程式的資源請求，則使用代理邏輯
    if (isReactAppResource(request)) {
        event.respondWith(
            forwardToNode(request)
            .catch(error => {
                console.error('[SW] Forwarding failed:', error);
                return new Response(`Failed to load resource from node: ${error.message}`, { status: 502 });
            })
        );
    }
    // 對於其他請求（例如 loader.html 本身），可以採用快取優先策略
    else {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                return cachedResponse || fetch(request);
            })
        );
    }
});