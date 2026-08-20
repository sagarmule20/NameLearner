/* Filename parsing + the four ways photos can reach the app.

   Convention:  first_second_third_last_gender_class.jpg
   Missing parts are a single "-".  Spaces are allowed *inside* a field
   ("Johannes_-_-_von Trapp_m_2C.jpg"); "_" is the separator and nothing else. */
(function (global) {
  'use strict';

  var EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'bmp'];
  var FIELDS = 6;

  var GENDERS = {
    m: 'm', male: 'm', maennlich: 'm', 'männlich': 'm', j: 'm', b: 'm',
    f: 'f', w: 'f', female: 'f', weiblich: 'f', girl: 'f',
    d: 'd', x: 'd', divers: 'd', other: 'd'
  };

  function splitExt(filename) {
    var dot = filename.lastIndexOf('.');
    if (dot <= 0) return { base: filename, ext: '' };
    return { base: filename.slice(0, dot), ext: filename.slice(dot + 1).toLowerCase() };
  }

  function opt(v) {
    var s = (v || '').trim();
    return (s === '' || s === '-') ? null : s;
  }

  /** → {ok:true, student} | {ok:false, reason:<i18n key>} */
  function parseFilename(filename) {
    var parts = splitExt(filename);
    var ext = parts.ext;

    if (ext === 'heic' || ext === 'heif') return { ok: false, reason: 'errHeic' };
    if (EXTS.indexOf(ext) === -1) return { ok: false, reason: 'errExt' };

    var f = parts.base.split('_');
    if (f.length !== FIELDS) return { ok: false, reason: 'errFields' };

    var first = opt(f[0]);
    var last = opt(f[3]);
    if (!first || !last) return { ok: false, reason: 'errEmpty' };

    var genderRaw = (f[4] || '').trim().toLowerCase();
    var gender = GENDERS[genderRaw];
    if (!gender) return { ok: false, reason: 'errGender' };

    return {
      ok: true,
      student: {
        id: parts.base,
        first: first,
        mid1: opt(f[1]),
        mid2: opt(f[2]),
        last: last,
        gender: gender,
        cls: opt(f[5]) || '—',
        file: filename,
        src: null            // filled in by the loader
      }
    };
  }

  /** Full name as plain text, for exports and alt attributes. */
  function fullName(s) {
    return [s.first, s.mid1, s.mid2, s.last].filter(Boolean).join(' ');
  }

  // ── Loaders ─────────────────────────────────────────────
  var objectUrls = [];

  function trackUrl(url) { objectUrls.push(url); return url; }

  function revokeAll() {
    objectUrls.forEach(function (u) {
      try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
    });
    objectUrls = [];
  }

  /** Turns a list of {name, src} into {students, skipped}, de-duplicating by id. */
  function build(items) {
    var students = [];
    var skipped = [];
    var seen = {};

    items.forEach(function (item) {
      var res = parseFilename(item.name);
      if (!res.ok) {
        skipped.push({ file: item.name, reason: res.reason });
        return;
      }
      if (seen[res.student.id]) {
        skipped.push({ file: item.name, reason: 'errDupe' });
        return;
      }
      seen[res.student.id] = true;
      res.student.src = item.src;
      students.push(res.student);
    });

    students.sort(function (a, b) {
      return (a.cls + a.last + a.first).localeCompare(b.cls + b.last + b.first, 'de');
    });
    return { students: students, skipped: skipped };
  }

  /** Bundled example portraits (list comes from demo/demo-manifest.js). */
  function loadDemo() {
    var files = global.DEMO_FILES || [];
    return build(files.map(function (name) {
      return { name: name, src: 'demo/' + encodeURIComponent(name) };
    }));
  }

  /** <input type="file" webkitdirectory> — the no-server path. */
  function loadFromFileList(fileList) {
    var items = [];
    var blobs = [];

    Array.prototype.forEach.call(fileList, function (file) {
      var name = file.name;
      if (name.charAt(0) === '.') return;                  // .DS_Store & friends
      var res = parseFilename(name);
      if (res.ok) blobs.push({ id: res.student.id, name: name, blob: file });
      items.push({ name: name, src: trackUrl(URL.createObjectURL(file)) });
    });

    var out = build(items);
    out.blobs = blobs;
    return out;
  }

  /** Cached blobs from a previous folder pick. */
  function loadFromCache() {
    return global.Store.readCachedPhotos().then(function (entries) {
      if (!entries || !entries.length) return null;
      var out = build(entries.map(function (e) {
        return { name: e.name, src: trackUrl(URL.createObjectURL(e.blob)) };
      }));
      return out.students.length ? out : null;
    });
  }

  /** students/manifest.json — only reachable over http(s); file:// blocks fetch. */
  function loadFromManifest() {
    var proto = global.location.protocol;
    if (proto !== 'http:' && proto !== 'https:') return Promise.resolve(null);

    return fetch('students/manifest.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var files = data && (data.files || data);
        if (!files || !files.length) return null;
        var out = build(files.map(function (name) {
          return { name: name, src: 'students/' + encodeURIComponent(name) };
        }));
        return out.students.length ? out : null;
      })
      .catch(function () { return null; });
  }

  global.Data = {
    EXTS: EXTS,
    parseFilename: parseFilename,
    fullName: fullName,
    loadDemo: loadDemo,
    loadFromFileList: loadFromFileList,
    loadFromCache: loadFromCache,
    loadFromManifest: loadFromManifest,
    revokeAll: revokeAll
  };
})(window);
