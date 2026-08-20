/* German / English string table. Classic script — no modules, works from file://. */
(function (global) {
  'use strict';

  var STRINGS = {
    de: {
      appTitle: 'Namen lernen',
      statGreen: 'gelernt',
      statYellow: 'unsicher',
      statRed: 'falsch',
      statUnseen: 'offen',
      settings: 'Einstellungen',
      whoIs: 'Wer ist das?',

      allDoneTitle: 'Alle Namen gelernt!',
      allDoneBody: 'Jede Karte steht auf grün. Du kannst den Fortschritt in den Einstellungen zurücksetzen.',
      openSettings: 'Einstellungen öffnen',
      loading: 'Fotos werden geladen …',
      noDataTitle: 'Keine Fotos gefunden',
      noDataBody: 'Lade deinen Fotoordner, oder starte mit den Beispieldaten.',

      dataSource: 'Datenquelle',
      pickFolder: 'Fotoordner laden',
      useDemo: 'Beispieldaten',
      namingHint: 'Dateiname: <code>Vorname_Zweitname_Drittname_Nachname_Geschlecht_Klasse.jpg</code> — fehlende Teile als <code>-</code>. Beispiel: <code>Lukas_Maria_-_Gruber_m_3B.jpg</code>',
      skippedTitle: 'Übersprungene Dateien',

      classes: 'Klassen',
      allClasses: 'Alle',
      quizOptions: 'Abfrage',
      optionCount: 'Antwortmöglichkeiten',
      redDelay: 'Wiedervorlage nach Fehler',
      sameGender: 'Falsche Antworten mit gleichem Geschlecht',
      showLegend: 'Namens-Legende anzeigen',
      language: 'Sprache',

      progress: 'Fortschritt',
      exportProgress: 'Exportieren',
      importProgress: 'Importieren',
      resetProgress: 'Zurücksetzen',

      legendTitle: 'Namens-Legende',
      legFirst: 'Vorname',
      legMid1: 'Zweitname',
      legMid2: 'Drittname',
      legLast: 'Nachname',
      privacyNote: 'Alle Daten bleiben auf diesem Gerät. Die App sendet nichts ins Internet.',

      correct: 'Richtig!',
      wrong: 'Leider falsch.',
      howWell: 'Wie sicher warst du?',
      thatWas: 'Das ist:',
      knowIt: 'Sicher — nicht mehr fragen',
      unsure: 'Unsicher — nochmal fragen',
      next: 'Weiter',

      srcDemo: 'Beispieldaten ({n} Schüler:innen)',
      srcFolder: 'Eigener Ordner ({n} Schüler:innen)',
      srcCache: 'Eigener Ordner, zwischengespeichert ({n} Schüler:innen)',
      srcNone: 'Noch keine Daten geladen',

      loaded: '{n} Schüler:innen geladen',
      resetDone: 'Fortschritt zurückgesetzt',
      resetConfirm: 'Gesamten Lernfortschritt wirklich löschen?',
      exported: 'Fortschritt exportiert',
      imported: 'Fortschritt importiert',
      importFailed: 'Import fehlgeschlagen — ungültige Datei',
      noPhotos: 'In diesem Ordner wurden keine passenden Fotos gefunden',
      classEmpty: 'Diese Auswahl enthält keine Schüler:innen',

      errFields: 'braucht genau 6 durch _ getrennte Teile',
      errExt: 'kein unterstütztes Bildformat',
      errHeic: 'HEIC kann der Browser nicht anzeigen — bitte in JPG umwandeln',
      errGender: 'Geschlecht muss m, w/f oder d sein',
      errEmpty: 'Vor- und Nachname dürfen nicht leer sein',
      errDupe: 'doppelter Dateiname — wird ignoriert'
    },

    en: {
      appTitle: 'Learn names',
      statGreen: 'learned',
      statYellow: 'unsure',
      statRed: 'wrong',
      statUnseen: 'open',
      settings: 'Settings',
      whoIs: 'Who is this?',

      allDoneTitle: 'All names learned!',
      allDoneBody: 'Every card is green. You can reset your progress in the settings.',
      openSettings: 'Open settings',
      loading: 'Loading photos …',
      noDataTitle: 'No photos found',
      noDataBody: 'Load your photo folder, or start with the example data.',

      dataSource: 'Data source',
      pickFolder: 'Load photo folder',
      useDemo: 'Example data',
      namingHint: 'File name: <code>first_second_third_last_gender_class.jpg</code> — use <code>-</code> for missing parts. Example: <code>Lukas_Maria_-_Gruber_m_3B.jpg</code>',
      skippedTitle: 'Skipped files',

      classes: 'Classes',
      allClasses: 'All',
      quizOptions: 'Quiz',
      optionCount: 'Answer options',
      redDelay: 'Repeat after a mistake',
      sameGender: 'Wrong answers of the same gender',
      showLegend: 'Show name legend',
      language: 'Language',

      progress: 'Progress',
      exportProgress: 'Export',
      importProgress: 'Import',
      resetProgress: 'Reset',

      legendTitle: 'Name legend',
      legFirst: 'First name',
      legMid1: 'Second name',
      legMid2: 'Third name',
      legLast: 'Last name',
      privacyNote: 'All data stays on this device. The app never sends anything to the internet.',

      correct: 'Correct!',
      wrong: 'Not quite.',
      howWell: 'How sure were you?',
      thatWas: 'This is:',
      knowIt: 'Sure — stop asking',
      unsure: 'Unsure — ask again',
      next: 'Next',

      srcDemo: 'Example data ({n} students)',
      srcFolder: 'Your folder ({n} students)',
      srcCache: 'Your folder, cached ({n} students)',
      srcNone: 'No data loaded yet',

      loaded: 'Loaded {n} students',
      resetDone: 'Progress reset',
      resetConfirm: 'Really delete all learning progress?',
      exported: 'Progress exported',
      imported: 'Progress imported',
      importFailed: 'Import failed — invalid file',
      noPhotos: 'No matching photos found in that folder',
      classEmpty: 'This selection contains no students',

      errFields: 'needs exactly 6 parts separated by _',
      errExt: 'not a supported image format',
      errHeic: 'browsers cannot display HEIC — please convert to JPG',
      errGender: 'gender must be m, w/f or d',
      errEmpty: 'first and last name must not be empty',
      errDupe: 'duplicate file name — ignored'
    }
  };

  var lang = 'de';

  var I18n = {
    get lang() { return lang; },

    setLang: function (next) {
      if (STRINGS[next]) {
        lang = next;
        document.documentElement.lang = next;
      }
      return lang;
    },

    /** t('loaded', {n: 30}) → "30 Schüler:innen geladen" */
    t: function (key, vars) {
      var s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.de[key] || key;
      if (vars) {
        Object.keys(vars).forEach(function (k) {
          s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
        });
      }
      return s;
    },

    /** Re-renders every [data-i18n] / [data-i18n-aria] node in the document. */
    apply: function (root) {
      (root || document).querySelectorAll('[data-i18n]').forEach(function (el) {
        el.innerHTML = I18n.t(el.getAttribute('data-i18n'));
      });
      (root || document).querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        el.setAttribute('aria-label', I18n.t(el.getAttribute('data-i18n-aria')));
      });
      document.title = I18n.t('appTitle');
    }
  };

  global.I18n = I18n;
})(window);
