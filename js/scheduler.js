/* Three-bucket spaced repetition.

   green  → mastered, never asked again
   yellow → correct but shaky, comes back after a widening number of questions
   red    → wrong, comes back after ~1–2 minutes (and at least 3 questions later)

   Due-ness is tracked on two axes at once — wall clock (dueAt) and question counter
   (dueAtQ) — because "in 2 minutes" is meaningless if the teacher answers 20 cards a
   minute, and "in 5 cards" is meaningless if they walk away for an hour. */
(function (global) {
  'use strict';

  var YELLOW_STEPS = [5, 10, 20];   // questions until a yellow card returns
  var RED_MIN_GAP = 3;              // never the very next question
  var YELLOW_MIN_WAIT = 20 * 1000;  // wall-clock floor for yellow

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function Scheduler() {
    this.students = [];
    this.byId = {};
    this.progress = global.Store.emptyProgress();
    this.settings = global.Store.loadSettings();
    this.lastAskedId = null;
    this.lastAskedCls = null;
  }

  Scheduler.prototype.setStudents = function (list) {
    this.students = list || [];
    this.byId = {};
    var self = this;
    this.students.forEach(function (s) { self.byId[s.id] = s; });
    this.lastAskedId = null;
    this.lastAskedCls = null;
  };

  Scheduler.prototype.setProgress = function (p) { this.progress = p || global.Store.emptyProgress(); };
  Scheduler.prototype.setSettings = function (s) { this.settings = s; };

  /** Progress record for a student, created on first touch. */
  Scheduler.prototype.rec = function (id) {
    var r = this.progress.students[id];
    if (!r) {
      r = { state: 'unseen', dueAt: 0, dueAtQ: 0, yellowStreak: 0, correct: 0, wrong: 0, confusedWith: {} };
      this.progress.students[id] = r;
    }
    if (!r.confusedWith) r.confusedWith = {};
    return r;
  };

  Scheduler.prototype.state = function (id) { return this.rec(id).state; };

  /** All classes present in the roster, sorted. */
  Scheduler.prototype.classes = function () {
    var set = {};
    this.students.forEach(function (s) { set[s.cls] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'de'); });
  };

  /** Students inside the current class filter. */
  Scheduler.prototype.active = function () {
    var sel = this.settings.classes;
    if (!sel || !sel.length) return this.students;
    return this.students.filter(function (s) { return sel.indexOf(s.cls) !== -1; });
  };

  Scheduler.prototype.stats = function () {
    var self = this;
    var out = { green: 0, yellow: 0, red: 0, unseen: 0, total: 0 };
    this.active().forEach(function (s) {
      out[self.rec(s.id).state]++;
      out.total++;
    });
    return out;
  };

  // ── Due-ness ────────────────────────────────────────────
  Scheduler.prototype.isDue = function (r, now, q) {
    return now >= (r.dueAt || 0) && q >= (r.dueAtQ || 0);
  };

  /** How far past due, blending both axes so they can be compared. */
  Scheduler.prototype.overdue = function (r, now, q) {
    var byQ = q - (r.dueAtQ || 0);
    var byTime = (now - (r.dueAt || 0)) / 30000;
    return Math.max(byQ, byTime);
  };

  /**
   * Next student to ask.
   * Priority: due red  →  new card (every 3rd, or when nothing yellow is waiting)
   *           →  due yellow  →  new card  →  fast-forward to the soonest due.
   */
  Scheduler.prototype.pickStudent = function () {
    var self = this;
    var now = Date.now();
    var q = this.progress.qIndex;

    var pool = this.active().filter(function (s) { return self.rec(s.id).state !== 'green'; });
    if (!pool.length) return null;

    // Avoid repeating the same card back to back when there is an alternative.
    var candidates = pool.length > 1
      ? pool.filter(function (s) { return s.id !== self.lastAskedId; })
      : pool;

    // Mix the selected classes: prefer a different class than the last question.
    // Best effort — with one class selected, or only one class left, it falls back.
    var otherClass = candidates.filter(function (s) { return s.cls !== self.lastAskedCls; });

    function byOverdue(list) {
      return list.slice().sort(function (a, b) {
        return self.overdue(self.rec(b.id), now, q) - self.overdue(self.rec(a.id), now, q);
      });
    }

    function mostOverdue(list) {
      var sorted = byOverdue(list);
      return pickRandom(sorted.slice(0, Math.min(3, sorted.length)));
    }

    /** Due or new card from list, or null when nothing in it is ready. */
    function choose(list) {
      var red = [], yellow = [], unseen = [];
      list.forEach(function (s) {
        var r = self.rec(s.id);
        if (r.state === 'unseen') unseen.push(s);
        else if (self.isDue(r, now, q)) (r.state === 'red' ? red : yellow).push(s);
      });

      if (red.length) return mostOverdue(red);
      if (unseen.length && (!yellow.length || q % 3 === 0)) return pickRandom(unseen);
      if (yellow.length) return mostOverdue(yellow);
      if (unseen.length) return pickRandom(unseen);
      return null;
    }

    var picked = (otherClass.length && choose(otherClass)) || choose(candidates);
    if (picked) return picked;

    // Nothing due yet — pull the soonest card forward so the session never stalls.
    return byOverdue(otherClass.length ? otherClass : candidates)[0];
  };

  /**
   * Wrong answers, drawn in tiers so that gender never gives the answer away
   * and, optionally, classmates are preferred (they are the genuinely confusable
   * ones). With sameClass off, wrong answers come from all selected classes.
   */
  Scheduler.prototype.buildOptions = function (correct) {
    var count = Math.max(2, parseInt(this.settings.optionCount, 10) || 4);
    var sameGender = this.settings.sameGender !== false;
    var sameClass = this.settings.sameClass !== false;

    var pool = this.active().filter(function (s) { return s.id !== correct.id; });
    if (pool.length < count - 1) {
      pool = this.students.filter(function (s) { return s.id !== correct.id; });
    }

    function cls(s) { return s.cls === correct.cls; }
    function gender(s) { return s.gender === correct.gender; }
    function both(s) { return cls(s) && gender(s); }
    function any() { return true; }

    var tiers;
    if (sameGender && sameClass) tiers = [both, gender, cls, any];
    else if (sameGender) tiers = [gender, any];
    else if (sameClass) tiers = [cls, any];
    else tiers = [any];

    var chosen = [];
    var taken = {};
    taken[correct.id] = true;

    for (var t = 0; t < tiers.length && chosen.length < count - 1; t++) {
      var bucket = shuffle(pool.filter(function (s) { return !taken[s.id] && tiers[t](s); }));
      for (var i = 0; i < bucket.length && chosen.length < count - 1; i++) {
        taken[bucket[i].id] = true;
        chosen.push(bucket[i]);
      }
    }

    return shuffle(chosen.concat([correct]));
  };

  /** → {student, options} or null when everything active is green. */
  Scheduler.prototype.nextQuestion = function () {
    var student = this.pickStudent();
    if (!student) return null;
    this.lastAskedId = student.id;
    this.lastAskedCls = student.cls;
    return { student: student, options: this.buildOptions(student) };
  };

  // ── Answer handling ─────────────────────────────────────
  Scheduler.prototype.redDelayMs = function () {
    var base = parseInt(this.settings.redDelay, 10) || 60;
    // The default "60" means the requested 1–2 minutes; fixed values stay fixed.
    var ms = base === 60 ? (60 + Math.random() * 60) * 1000 : base * 1000;
    return ms;
  };

  Scheduler.prototype.markWrong = function (studentId, pickedId) {
    var r = this.rec(studentId);
    var q = this.progress.qIndex;

    r.state = 'red';
    r.wrong++;
    r.yellowStreak = 0;
    r.dueAt = Date.now() + this.redDelayMs();
    r.dueAtQ = q + RED_MIN_GAP;

    if (pickedId) {
      r.confusedWith[pickedId] = (r.confusedWith[pickedId] || 0) + 1;
      var other = this.rec(pickedId);
      other.confusedWith[studentId] = (other.confusedWith[studentId] || 0) + 1;
    }
    this.finish();
  };

  /** grade: 'green' (mastered) or 'yellow' (correct but unsure). */
  Scheduler.prototype.markCorrect = function (studentId, grade) {
    var r = this.rec(studentId);
    var q = this.progress.qIndex;

    r.correct++;

    if (grade === 'green') {
      r.state = 'green';
      r.dueAt = 0;
      r.dueAtQ = 0;
      r.yellowStreak = 0;
    } else {
      r.state = 'yellow';
      var step = YELLOW_STEPS[Math.min(r.yellowStreak, YELLOW_STEPS.length - 1)];
      r.dueAtQ = q + step;
      r.dueAt = Date.now() + YELLOW_MIN_WAIT;
      r.yellowStreak++;
    }
    this.finish();
  };

  Scheduler.prototype.finish = function () {
    this.progress.qIndex++;
    global.Store.saveProgress(this.progress);
  };

  Scheduler.prototype.reset = function () {
    this.progress = global.Store.clearProgress();
    this.lastAskedId = null;
    this.lastAskedCls = null;
  };

  global.Scheduler = Scheduler;
})(window);
