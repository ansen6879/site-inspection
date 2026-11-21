/* 離線快取：整組檔案綁同一個 BUILD，一次快取、一次切換，避免新舊檔案混用。
 * - 安裝：逐一下載 FILES，並以 HASHES 核對每個檔案的 SHA-256（文字檔換行統一為 LF）；任一不符或失敗即安裝失敗，繼續用舊版。
 *   （防止網站部署中途或 CDN 快取讓不同檔案來自不同版本）
 * - 使用：應用程式首頁與檔案一律從同一組快取讀取（離線也能開）；快取沒有的才上網。
 * - 更新：檔案內容改變 → 執行 `node tools/stamp_build.js` 更新 BUILD 與 HASHES → 瀏覽器偵測 sw.js 改變後安裝新版，
 *   啟用時只刪除本安裝範圍（scope）的舊快取，頁面收到 controllerchange 後重新載入一次（ui.js）。
 * BUILD、HASHES 與檔案內容不符時 tests/sw.test.js 會失敗。版本號仍只在使用者說「進版」時調整（version.js）。
 */
importScripts('version.js');
var BUILD = '96ee3cf6a7b8';
var HASHES = {
  'index.html': 'a82db6db7a92eef0bc9cf84a9b9a76fa367c24c7a8ffec361dc8fb66e2b72bca',
  'version.js': '0d3d5ca038b3cc49b93a6111faedde8e8fffc6e0596d8491a6a63a43354bff1b',
  'manifest.webmanifest': '03abf154cf68109c211c9b2e14de9faef971c8d954cf5af7e815bb9bb1f0fa31',
  'css/app.css': '7f65e79f6775039a8c46b4622426f73d4c9657bf60ccbc9724607c2d1d9190af',
  'js/data.js': 'b56e8d4421265f4efde42ae5575c3ad3d9ca6a8538a1ffe752401d29b5a10288',
  'js/data-mep.js': '3e0b3ad412118b4aeb8b173e4f708405fc4a67400eb598024c4c72bc14d2ee44',
  'js/engine.js': '9df9d7f8a7334ef3bb842d7c800a3254801bbcf79bd17b733ac7ad4aada1d479',
  'js/engine-mep.js': 'b496229b736f40bb8fe5448bbf038059bee2973a148a3a268f2104a9a74a4a14',
  'js/svg.js': 'a68fbf6f4ebf155d2cb7031a9fbdefba3099f4ace9e50369a56eb47724b6d79f',
  'js/svg-mep.js': '639509cf8e146bd879b9bdc019017c8baa218f0950c830da7668e9c1917e9c37',
  'js/modules.js': '81a592e465236655668fcefb28881c192fa6fd344da5c5c42f502639e3d2b4ec',
  'js/ui.js': '6b8bb5991cae2d2992e742ae8f36d2e193022707f4cc6617c1040e08720fecdc',
  'icons/icon.svg': '3e240325f0360d7e25ff4eae3764ddf98d3268d541f164c435f9195b870670de',
  'icons/icon-192.png': '5fd59fdd742c87cbd1cfd1eba3b064a07121cf8b7c93a93dd6eb7a78b343323c',
  'icons/icon-512.png': '0404e3e070cef185afc207aa5770195d03e44359ca0d6c3dc8cb75e707f7a80f',
  'icons/apple-touch-icon.png': '9f885c4acf7c9ec14a0b6291583b69d87711c608e859dee36b98062378eb5841'
};
var FILES = [
  './', 'index.html', 'version.js', 'manifest.webmanifest', 'css/app.css',
  'js/data.js', 'js/data-mep.js', 'js/engine.js', 'js/engine-mep.js', 'js/svg.js', 'js/svg-mep.js', 'js/modules.js', 'js/ui.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
var SCOPE = self.registration.scope;
var PREFIX = 'sis-' + SCOPE + '|';
var CACHE = PREFIX + self.SC_VERSION + '-' + BUILD;

function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
function digest(name, buf) {
  var data = buf;
  if (!/\.png$/i.test(name)) data = new TextEncoder().encode(new TextDecoder('utf-8').decode(buf).replace(/\r\n/g, '\n'));
  return crypto.subtle.digest('SHA-256', data).then(hex);
}
// 安裝：先下載到暫存快取並逐檔核對，全部通過才寫入正式快取；失敗只刪除暫存，不影響目前使用中的快取。
// 同一 BUILD 的快取修復時若寫入中途失敗，正式快取內只會有同一 BUILD、已核對的正確內容，缺的檔案執行時由 appFile 再核對補回。
function download(c) {
  var names = FILES.filter(function (f) { return f !== './'; });
  return Promise.all(names.map(function (f) {
    return fetch(new Request(f, { cache: 'reload' })).then(function (res) {
      if (!res.ok) throw new Error(f + ' HTTP ' + res.status);
      return res.clone().arrayBuffer().then(function (buf) { return digest(f, buf); }).then(function (h) {
        if (h !== HASHES[f]) throw new Error(f + ' 內容與 BUILD ' + BUILD + ' 不符');
        return [f, res];
      });
    });
  })).then(function (pairs) {
    // 全部核對通過才寫入暫存；首頁同時存為 './'
    return Promise.all(pairs.map(function (p) {
      var w = [c.put(p[0], p[1].clone())];
      if (p[0] === 'index.html') w.push(c.put('./', p[1].clone()));
      return Promise.all(w);
    }));
  });
}
function copyAll(from, to) {
  return from.keys().then(function (rs) {
    return Promise.all(rs.map(function (r) { return from.match(r).then(function (res) { return to.put(r, res); }); }));
  });
}
// 既有快取是否為完整且內容正確的同一組（鍵名齊全、每檔雜湊相符）
function cacheComplete(c) {
  return Promise.all(FILES.map(function (f) {
    var name = f === './' ? 'index.html' : f;
    return c.match(f).then(function (res) {
      if (!res) return false;
      return res.arrayBuffer().then(function (buf) { return digest(name, buf); }).then(function (h) { return h === HASHES[name]; });
    });
  })).then(function (oks) { return oks.every(Boolean); });
}
self.addEventListener('install', function (e) {
  var TMP = CACHE + '#install-' + Date.now();
  e.waitUntil(caches.open(CACHE).then(function (cur) {
    return cacheComplete(cur).then(function (ok) {
      if (ok) return; // 同一 BUILD 已完整且核對無誤（例如 sw.js 只有換行位元組不同）
      return caches.open(TMP).then(function (tmp) {
        return download(tmp).then(function () { return copyAll(tmp, cur); });
      }).then(function () { return caches.delete(TMP); }, function (err) {
        return caches.delete(TMP).then(function () { throw err; });
      });
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      // 只清本範圍的舊版與殘留暫存，以及舊版程式留下、名稱不含範圍的 sis- 快取
      return (k.indexOf(PREFIX) === 0 && k !== CACHE) || (k.indexOf('sis-') === 0 && k.indexOf('|') < 0);
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// 應用程式檔案（FILES）快取中缺檔時：上網取得並以 HASHES 核對，相符才使用並補進快取，不符則回 504，避免混入其他版本
function appFile(name, req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      // 網路錯誤、HTTP 錯誤、雜湊不符一律回 504，不把未經核對的回應交給頁面
      var fail = function () { return new Response('版本不一致或無法取得，請稍後重新開啟', { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); };
      return fetch(new Request(name, { cache: 'reload' })).then(function (res) {
        if (!res.ok) return fail();
        return res.clone().arrayBuffer().then(function (buf) { return digest(name, buf); }).then(function (h) {
          if (h !== HASHES[name]) return fail();
          // 已核對的回應：寫入快取失敗不影響本次使用
          return c.put(name, res.clone()).then(function () { return res; }, function () { return res; });
        });
      }).catch(fail); // 標頭後斷線、讀取或雜湊失敗也回 504
    });
  });
}
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  var scopePath = new URL(SCOPE).pathname;
  if (url.pathname.indexOf(scopePath) !== 0) return;
  var rel = url.pathname.slice(scopePath.length);
  if (e.request.mode === 'navigate') {
    // 只有應用程式首頁（範圍根目錄、index.html）回快取首頁；其他路徑照常上網
    if (rel !== '' && rel !== 'index.html') return;
    e.respondWith(appFile('index.html', 'index.html'));
    return;
  }
  if (rel === '' ? false : HASHES.hasOwnProperty(rel)) { e.respondWith(appFile(rel, e.request)); return; }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || fetch(e.request); });
  }));
});
