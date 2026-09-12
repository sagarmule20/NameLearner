/* All DOM rendering. Nothing here knows about scheduling rules. */
(function (global) {
  'use strict';

  var t = function (k, v) { return global.I18n.t(k, v); };
  function $(id) { return document.getElementById(id); }

  var SECTIONS = ['quiz', 'done', 'loading', 'nodata'];

  function show(which) {
    SECTIONS.forEach(function (id) {
      var el = $(id);
      if (el) el.classList.toggle('hidden', id !== which);
    });
  }

  /** Renders the name with one span per part, styled to distinguish the parts. */
  function renderName(el, s) {
    el.textContent = '';
    var parts = [
      { v: s.first, cls: 'n-first' },
      { v: s.mid1, cls: 'n-mid1' },
      { v: s.mid2, cls: 'n-mid2' },
      { v: s.last, cls: 'n-last' }
    ];
    var first = true;
    parts.forEach(function (p) {
      if (!p.v) return;
      // A real space, not a CSS margin, so the name stays readable to screen
      // readers and survives copy-paste.
      if (!first) el.appendChild(document.createTextNode(' '));
      first = false;
      var span = document.createElement('span');
      span.className = p.cls;
      span.textContent = p.v;
      el.appendChild(span);
    });

    if (s.nick) {
      el.appendChild(document.createTextNode(' '));
      var nick = document.createElement('span');
      nick.className = 'n-nick';
      nick.textContent = '(' + s.nick + ')';
      el.appendChild(nick);
    }
  }

  /** Falls back to a coloured initials tile when an image cannot be decoded. */
  function attachPhoto(btn, student) {
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'eager';
    img.decoding = 'async';
    img.src = student.src;
    img.onerror = function () {
      img.remove();
      var ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = (student.first[0] || '?') + (student.last[0] || '');
      ph.style.cssText =
        'width:100%;height:100%;display:grid;place-items:center;font-size:2rem;' +
        'font-weight:700;color:var(--muted);background:var(--surface-2);';
      btn.insertBefore(ph, btn.firstChild);
    };
    btn.appendChild(img);
  }

  /** Draws the question and wires each photo to onPick(student). */
  function renderQuestion(q, onPick) {
    renderName($('qName'), q.student);
    $('qClass').textContent = q.student.cls;

    var stateChip = $('qState');
    stateChip.dataset.state = q.state || 'unseen';
    stateChip.textContent = t('stat' + q.state.charAt(0).toUpperCase() + q.state.slice(1));

    var grid = $('optionGrid');
    grid.textContent = '';
    grid.classList.toggle('cols-6', q.options.length > 4);

    q.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.dataset.id = opt.id;
      btn.setAttribute('aria-label', String(i + 1));

      attachPhoto(btn, opt);

      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(i + 1);
      btn.appendChild(num);

      var mark = document.createElement('span');
      mark.className = 'mark';
      btn.appendChild(mark);

      btn.addEventListener('click', function () { onPick(opt, btn); });
      grid.appendChild(btn);
    });

    $('feedback').textContent = '';
    show('quiz');
  }

  /** Locks the grid and marks correct / wrong tiles. */
  function revealAnswer(correctId, pickedId) {
    var buttons = $('optionGrid').querySelectorAll('.opt');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.disabled = true;
      var id = btn.dataset.id;
      if (id === correctId) {
        btn.classList.add('is-correct');
        btn.querySelector('.mark').textContent = '✓';
      } else if (id === pickedId) {
        btn.classList.add('is-wrong');
        btn.querySelector('.mark').textContent = '✕';
      } else {
        btn.classList.add('is-dim');
      }
    });
  }

  function button(label, cls, kbd, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + cls;
    b.textContent = label;
    if (kbd) {
      var k = document.createElement('span');
      k.className = 'kbd';
      k.textContent = kbd;
      b.appendChild(k);
    }
    b.addEventListener('click', onClick);
    return b;
  }

  /** After a correct pick: the teacher self-grades green vs yellow. */
  function showCorrectFeedback(student, onGrade) {
    var box = $('feedback');
    box.textContent = '';

    var card = document.createElement('div');
    card.className = 'fb-card';

    var title = document.createElement('div');
    title.className = 'fb-title ok';
    title.textContent = t('correct');
    card.appendChild(title);

    var sub = document.createElement('div');
    sub.className = 'fb-sub';
    sub.textContent = t('howWell');
    card.appendChild(sub);

    var actions = document.createElement('div');
    actions.className = 'fb-actions';
    actions.appendChild(button(t('knowIt'), 'btn-green', 'G', function () { onGrade('green'); }));
    actions.appendChild(button(t('unsure'), 'btn-yellow', 'U', function () { onGrade('yellow'); }));
    card.appendChild(actions);

    box.appendChild(card);
  }

  /** After a wrong pick: show who it actually was, then continue. */
  function showWrongFeedback(student, onNext) {
    var box = $('feedback');
    box.textContent = '';

    var card = document.createElement('div');
    card.className = 'fb-card';

    var title = document.createElement('div');
    title.className = 'fb-title bad';
    title.textContent = t('wrong');
    card.appendChild(title);

    var sub = document.createElement('div');
    sub.className = 'fb-sub';
    sub.textContent = t('thatWas') + ' ';
    var nameEl = document.createElement('span');
    renderName(nameEl, student);
    sub.appendChild(nameEl);
    card.appendChild(sub);

    var actions = document.createElement('div');
    actions.className = 'fb-actions';
    actions.appendChild(button(t('next'), 'btn-primary', '⏎', onNext));
    card.appendChild(actions);

    box.appendChild(card);
    card.querySelector('.btn').focus();
  }

  function renderStats(stats) {
    $('statGreen').textContent = stats.green;
    $('statYellow').textContent = stats.yellow;
    $('statRed').textContent = stats.red;
    $('statUnseen').textContent = stats.unseen;

    var total = stats.total || 1;
    $('segGreen').style.width = (stats.green / total * 100) + '%';
    $('segYellow').style.width = (stats.yellow / total * 100) + '%';
    $('segRed').style.width = (stats.red / total * 100) + '%';
  }

  function renderClassChips(classes, selected, onToggle) {
    var box = $('classChips');
    box.textContent = '';
    var all = !selected || !selected.length;

    var allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'chip chip-btn' + (all ? ' is-on' : '');
    allChip.textContent = t('allClasses');
    allChip.addEventListener('click', function () { onToggle(null); });
    box.appendChild(allChip);

    classes.forEach(function (c) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip chip-btn' + (!all && selected.indexOf(c) !== -1 ? ' is-on' : '');
      chip.textContent = c;
      chip.addEventListener('click', function () { onToggle(c); });
      box.appendChild(chip);
    });
  }

  function renderSkipped(list) {
    var box = $('skippedBox');
    if (!list || !list.length) {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    $('skippedCount').textContent = list.length;
    var ul = $('skippedList');
    ul.textContent = '';
    list.slice(0, 40).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item.file + ' — ' + t(item.reason);
      ul.appendChild(li);
    });
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 2600);
  }

  global.UI = {
    $: $,
    show: show,
    renderName: renderName,
    renderQuestion: renderQuestion,
    revealAnswer: revealAnswer,
    showCorrectFeedback: showCorrectFeedback,
    showWrongFeedback: showWrongFeedback,
    renderStats: renderStats,
    renderClassChips: renderClassChips,
    renderSkipped: renderSkipped,
    toast: toast
  };
})(window);
