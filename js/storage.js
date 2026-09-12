/* Persistence: learning progress + settings in localStorage, photo blobs in IndexedDB.
   Every call degrades gracefully — a browser that blocks storage just loses persistence,
   never functionality. */
(function (global) {
  'use strict';

  var PROGRESS_KEY = 'bernhard.progress.v1';
  var SETTINGS_KEY = 'bernhard.settings.v1';

  var DEFAULT_SETTINGS = {
    lang: 'de',
    optionCount: 4,
    redDelay: 60,        // seconds; 60 means "60–120 s"
    sameGender: true,
    sameClass: true,     // wrong answers prefer the correct student's classmates
    showLegend: true,
    classes: null        // null = all classes
  };

  function readJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Progress ────────────────────────────────────────────
  function emptyProgress() {
    return { version: 1, qIndex: 0, students: {} };
  }

  function loadProgress() {
    var p = readJSON(PROGRESS_KEY, null);
    if (!p || typeof p !== 'object' || !p.students) return emptyProgress();
    p.qIndex = p.qIndex || 0;
    return p;
  }

  function saveProgress(p) { return writeJSON(PROGRESS_KEY, p); }

  function clearProgress() {
    try { global.localStorage.removeItem(PROGRESS_KEY); } catch (e) { /* ignore */ }
    return emptyProgress();
  }

  // ── Settings ────────────────────────────────────────────
  function loadSettings() {
    var s = readJSON(SETTINGS_KEY, {}) || {};
    var out = {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
      out[k] = (s[k] === undefined || s[k] === null && k !== 'classes') ? DEFAULT_SETTINGS[k] : s[k];
    });
    return out;
  }

  function saveSettings(s) { return writeJSON(SETTINGS_KEY, s); }

  // ── Photo cache (IndexedDB) ─────────────────────────────
  var DB_NAME = 'bernhard-photos';
  var STORE = 'photos';
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var idb = global.indexedDB;
      if (!idb) return resolve(null);
      var req;
      try { req = idb.open(DB_NAME, 1); } catch (e) { return resolve(null); }

      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
      req.onblocked = function () { resolve(null); };
      // file:// in some browsers hangs instead of erroring
      setTimeout(function () { resolve(req.result || null); }, 2500);
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDB().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        var t;
        try { t = db.transaction(STORE, mode); } catch (e) { return resolve(null); }
        var store = t.objectStore(STORE);
        var result = fn(store);
        t.oncomplete = function () { resolve(result && result.value !== undefined ? result.value : result); };
        t.onerror = function () { resolve(null); };
        t.onabort = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  /** Replaces the whole cache with the given [{id, name, blob}] entries. */
  function cachePhotos(entries) {
    return tx('readwrite', function (store) {
      store.clear();
      entries.forEach(function (e) {
        try { store.put({ id: e.id, name: e.name, blob: e.blob }); } catch (err) { /* skip */ }
      });
      return true;
    });
  }

  /** → [{id, name, blob}] or [] when nothing is cached / IndexedDB unavailable. */
  function readCachedPhotos() {
    return openDB().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve) {
        var t, req;
        try {
          t = db.transaction(STORE, 'readonly');
          req = t.objectStore(STORE).getAll();
        } catch (e) { return resolve([]); }
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { resolve([]); };
      });
    }).catch(function () { return []; });
  }

  function clearPhotoCache() {
    return tx('readwrite', function (store) { store.clear(); return true; });
  }

  global.Store = {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    emptyProgress: emptyProgress,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    clearProgress: clearProgress,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    cachePhotos: cachePhotos,
    readCachedPhotos: readCachedPhotos,
    clearPhotoCache: clearPhotoCache
  };
})(window);
