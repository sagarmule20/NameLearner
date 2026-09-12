# Namen lernen — Student Name Trainer

A small offline app for learning student names across several classes. It shows a name and
four photos; you pick the right face. Correct answers you grade yourself — **green** (mastered,
never asked again) or **yellow** (shaky, comes back later). Wrong answers turn **red** and come
back within a minute or two.

Everything runs locally. No server required, no accounts, no network calls, nothing uploaded.

## Start

**Just double-click `index.html`.** It opens with 30 example students so you can try it
immediately.

## Use your own photos

1. Put your photos in the `students/` folder.
2. Name each file:

   ```
   Vorname_Zweitname_Drittname_Nachname_Geschlecht_Klasse.jpg
   Vorname_Zweitname_Drittname_Nachname_Geschlecht_Klasse_Spitzname.jpg
   ```

   Six parts separated by `_`, plus an optional seventh part for a nickname.
   Use a single `-` for parts a student doesn't have. Spaces are fine *inside* a part.

   | File name | Reads as |
   |---|---|
   | `Anna_-_-_Huber_f_3B.jpg` | Anna **HUBER** · 3B |
   | `Lukas_Maria_-_Gruber_m_3B.jpg` | Lukas *Maria* **GRUBER** · 3B |
   | `Marie_Theresia_Anna_Pichler_f_4A.jpg` | Marie *Theresia* *Anna* **PICHLER** · 4A |
   | `Johannes_-_-_von Trapp_m_2C.jpg` | Johannes **VON TRAPP** · 2C |
   | `Bernhard_-_-_Dichtl_m_4A_Berni.jpg` | Bernhard **DICHTL** (Berni) · 4A |

   Adding or removing a nickname later keeps that student's learning progress.

   *Gender* is `m` / `w` / `f` / `d` — it is used so the three wrong answers are the same
   gender and don't give the answer away. *Class* can be anything (`3B`, `4A`, `Chor`, …).

   Supported: jpg, jpeg, png, webp, gif, avif, bmp, svg.
   **HEIC does not work** — browsers can't display it, convert to JPG first.

3. In the app: **⚙ → Fotoordner laden** and pick your `students/` folder.
   The photos are cached in the browser, so you normally only do this once.

Files that don't match the pattern appear under **Übersprungene Dateien** in the settings, each
with the reason — that's your feedback loop when a name is mistyped.

## How the name is displayed

Austrian names have two, three, or four parts, so each part is styled differently:

| Part | Style |
|---|---|
| First name | normal |
| Second name | *italic* |
| Third name | *italic, red* |
| Last name | **UPPERCASE bold** |
| Nickname | (grey, in brackets) |

A small legend under the question repeats this (can be switched off in settings).

## Optional: use it on your phone

Run `start.bat` (needs Python). It scans `students/`, serves the app, and prints two addresses:

```
On this PC :  http://localhost:8080
On phone   :  http://192.168.x.x:8080   (same WiFi)
```

In this mode the photo folder loads automatically on every reload — no folder picking.
The server binds to your local network only.

## How the repetition works

| Bucket | When | Comes back |
|---|---|---|
| 🟢 green | you answered correctly and pressed *Sicher* | never |
| 🟡 yellow | correct, but you pressed *Unsicher* | after 5, then 10, then 20 questions |
| 🔴 red | wrong answer | after 1–2 minutes, and at least 3 questions later |

Due-ness is tracked on the clock *and* on the question counter, so it behaves sensibly whether
you answer 20 cards a minute or come back an hour later.

The header shows the live count of green / yellow / red / not-yet-seen for the classes you have
selected.

## Keyboard

| Key | Action |
|---|---|
| `1` – `9` | pick that photo |
| `G` / `S` | *Sicher* (green) |
| `U` | *Unsicher* (yellow) |
| `Enter` | next question after a wrong answer |
| `Esc` | close settings |

## Settings

Class filter · 3/4/6 answer options · repeat delay after a mistake · same-gender wrong answers · same-class wrong answers ·
name legend · German/English · export, import, reset progress.

Progress lives in the browser's `localStorage` for this app; photos are cached in IndexedDB.
Export writes a JSON file you can back up or move to another machine.

## Files

```
index.html              the app
app.css
js/i18n.js              German / English strings
js/storage.js           localStorage progress + IndexedDB photo cache
js/data.js              file-name parsing and the four loading paths
js/scheduler.js         green/yellow/red buckets and the due queue
js/ui.js                rendering
js/main.js              session loop, settings, keyboard
demo/                   30 example portraits (AI-generated faces, not real people)
students/               your photos — git-ignored
start.bat, tools/serve.py   optional local server for phone access
```

## Privacy

`students/` is in `.gitignore`, so real photos cannot be committed by accident. The app makes no
network requests at all — you can verify this in the browser's DevTools Network tab. The example
portraits in `demo/` are AI-generated faces, not photos of real people.
