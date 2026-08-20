/* Session loop, settings wiring, keyboard shortcuts. */
(function (global) {
  'use strict';

  var $ = UI.$;
  var t = function (k, v) { return I18n.t(k, v); };

  var sched = new Scheduler();
  var settings = Store.loadSettings();
  var current = null;      // {student, options}
  var answered = false;
  var pendingGrade = false;
  var source = null;       // 'demo' | 'folder' | 'cache' | 'manifest'
  var skipped = [];

  // ── Boot ────────────────────────────────────────────────
  function boot() {
    I18n.setLang(settings.lang);
    I18n.apply();

    sched.setSettings(settings);
    sched.setProgress(Store.loadProgress());

    applySettingsToForm();
    wireEvents();
    UI.show('loading');

    Data.loadFromManifest()
      .then(function (res) {
        if (res) return applyDataset(res, 'manifest');
        return Data.loadFromCache().then(function (cached) {
          if (cached) return applyDataset(cached, 'cache');
          return applyDataset(Data.loadDemo(), 'demo');
        });
      })
      .catch(function () { applyDataset(Data.loadDemo(), 'demo'); });
  }

  function applyDataset(res, src) {
    source = src;
    skipped = res.skipped || [];
    sched.setStudents(res.students);

    UI.renderSkipped(skipped);
    updateSourceInfo();
    renderClasses();

    if (!res.students.length) {
      UI.show('nodata');
      return;
    }
    refreshStats();
    nextQuestion();
  }

  function updateSourceInfo() {
    var n = sched.students.length;
    var key = source === 'demo' ? 'srcDemo'
      : source === 'cache' ? 'srcCache'
        : source ? 'srcFolder' : 'srcNone';
    $('sourceInfo').textContent = t(key, { n: n });
  }

  // ── Question loop ───────────────────────────────────────
  function nextQuestion() {
    answered = false;
    pendingGrade = false;

    var q = sched.nextQuestion();
    if (!q) {
      current = null;
      refreshStats();
      UI.show(sched.active().length ? 'done' : 'nodata');
      return;
    }
    current = q;
    q.state = sched.state(q.student.id);
    UI.renderQuestion(q, onPick);
    applyLegendVisibility();
  }

  function onPick(opt) {
    if (answered || !current) return;
    answered = true;

    var correctId = current.student.id;
    UI.revealAnswer(correctId, opt.id);

    if (opt.id === correctId) {
      pendingGrade = true;
      UI.showCorrectFeedback(current.student, function (grade) {
        if (!pendingGrade) return;
        pendingGrade = false;
        sched.markCorrect(correctId, grade);
        refreshStats();
        nextQuestion();
      });
    } else {
      sched.markWrong(correctId, opt.id);
      refreshStats();
      UI.showWrongFeedback(current.student, nextQuestion);
    }
  }

  function refreshStats() { UI.renderStats(sched.stats()); }

  // ── Settings ────────────────────────────────────────────
  function persistSettings() {
    Store.saveSettings(settings);
    sched.setSettings(settings);
  }

  function applySettingsToForm() {
    $('optOptionCount').value = String(settings.optionCount);
    $('optRedDelay').value = String(settings.redDelay);
    $('optSameGender').checked = settings.sameGender !== false;
    $('optLegend').checked = settings.showLegend !== false;
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-lang') === settings.lang);
    });
  }

  function applyLegendVisibility() {
    $('qLegend').classList.toggle('hidden', settings.showLegend === false);
  }

  function renderClasses() {
    UI.renderClassChips(sched.classes(), settings.classes, function (cls) {
      if (cls === null) {
        settings.classes = null;
      } else {
        var sel = settings.classes ? settings.classes.slice() : [];
        var i = sel.indexOf(cls);
        if (i === -1) sel.push(cls); else sel.splice(i, 1);
        settings.classes = sel.length ? sel : null;
      }
      persistSettings();

      if (!sched.active().length) {
        UI.toast(t('classEmpty'));
        settings.classes = null;
        persistSettings();
      }
      renderClasses();
      refreshStats();
      nextQuestion();
    });
  }

  function openSheet(open) {
    $('settingsSheet').classList.toggle('hidden', !open);
    $('sheetBackdrop').classList.toggle('hidden', !open);
  }

  // ── Loading photos ──────────────────────────────────────
  function onFolderPicked(fileList) {
    if (!fileList || !fileList.length) return;
    UI.show('loading');
    Data.revokeAll();

    var res = Data.loadFromFileList(fileList);

    if (!res.students.length) {
      UI.toast(t('noPhotos'));
      applyDataset(res, 'folder');
      UI.renderSkipped(res.skipped);
      UI.show('nodata');
      return;
    }

    Store.cachePhotos(res.blobs || []);
    applyDataset(res, 'folder');
    UI.toast(t('loaded', { n: res.students.length }));
    openSheet(false);
  }

  function useDemo() {
    Data.revokeAll();
    Store.clearPhotoCache();
    applyDataset(Data.loadDemo(), 'demo');
    openSheet(false);
  }

  // ── Progress import / export ────────────────────────────
  function exportProgress() {
    var payload = {
      app: 'namen-lernen',
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: sched.progress
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'namen-fortschritt-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    UI.toast(t('exported'));
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var p = data.progress || data;
        if (!p || typeof p !== 'object' || !p.students) throw new Error('bad shape');
        p.qIndex = p.qIndex || 0;
        Store.saveProgress(p);
        sched.setProgress(p);
        refreshStats();
        nextQuestion();
        UI.toast(t('imported'));
      } catch (e) {
        UI.toast(t('importFailed'));
      }
    };
    reader.onerror = function () { UI.toast(t('importFailed')); };
    reader.readAsText(file);
  }

  // ── Events ──────────────────────────────────────────────
  function wireEvents() {
    $('btnSettings').addEventListener('click', function () { openSheet(true); });
    $('btnCloseSheet').addEventListener('click', function () { openSheet(false); });
    $('sheetBackdrop').addEventListener('click', function () { openSheet(false); });
    $('btnDoneSettings').addEventListener('click', function () { openSheet(true); });

    ['btnPickFolder', 'btnPickFolder2'].forEach(function (id) {
      $(id).addEventListener('click', function () { $('folderInput').click(); });
    });
    $('folderInput').addEventListener('change', function (e) {
      onFolderPicked(e.target.files);
      e.target.value = '';
    });

    ['btnUseDemo', 'btnUseDemo2'].forEach(function (id) {
      $(id).addEventListener('click', useDemo);
    });

    $('optOptionCount').addEventListener('change', function (e) {
      settings.optionCount = parseInt(e.target.value, 10);
      persistSettings();
      nextQuestion();
    });

    $('optRedDelay').addEventListener('change', function (e) {
      settings.redDelay = parseInt(e.target.value, 10);
      persistSettings();
    });

    $('optSameGender').addEventListener('change', function (e) {
      settings.sameGender = e.target.checked;
      persistSettings();
      nextQuestion();
    });

    $('optLegend').addEventListener('change', function (e) {
      settings.showLegend = e.target.checked;
      persistSettings();
      applyLegendVisibility();
    });

    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings.lang = btn.getAttribute('data-lang');
        I18n.setLang(settings.lang);
        persistSettings();
        I18n.apply();
        applySettingsToForm();
        updateSourceInfo();
        renderClasses();
        UI.renderSkipped(skipped);
        if (current && !answered) nextQuestion();
      });
    });

    $('btnExport').addEventListener('click', exportProgress);
    $('btnImport').addEventListener('click', function () { $('importInput').click(); });
    $('importInput').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
      e.target.value = '';
    });

    $('btnReset').addEventListener('click', function () {
      if (!global.confirm(t('resetConfirm'))) return;
      sched.reset();
      refreshStats();
      nextQuestion();
      UI.toast(t('resetDone'));
      openSheet(false);
    });

    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') { openSheet(false); return; }
    if (!$('settingsSheet').classList.contains('hidden')) return;
    if ($('quiz').classList.contains('hidden')) return;

    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

    // 1–9 pick a photo
    if (!answered && /^[1-9]$/.test(e.key)) {
      var idx = parseInt(e.key, 10) - 1;
      var btns = $('optionGrid').querySelectorAll('.opt');
      if (btns[idx]) { e.preventDefault(); btns[idx].click(); }
      return;
    }

    if (!answered) return;

    var buttons = $('feedback').querySelectorAll('.btn');
    var key = e.key.toLowerCase();

    if (pendingGrade) {
      if (key === 'g' || key === 's') { e.preventDefault(); if (buttons[0]) buttons[0].click(); }
      else if (key === 'u') { e.preventDefault(); if (buttons[1]) buttons[1].click(); }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (buttons[0]) buttons[0].click();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
