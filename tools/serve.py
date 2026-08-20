#!/usr/bin/env python3
"""Optional local server for the name trainer.

Why you might want it:
  * open the app on your phone over the same WiFi
  * the photo folder is picked up automatically on every reload,
    with no "choose folder" click

It only ever binds to your local network. Nothing is uploaded anywhere.

    python tools/serve.py                 # scan, then serve on :8080
    python tools/serve.py --port 9000
    python tools/serve.py --manifest-only # just rewrite the manifests and exit
"""

import argparse
import http.server
import json
import os
import socket
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_DIR = os.path.join(ROOT, "students")
DEMO_DIR = os.path.join(ROOT, "demo")

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".bmp"}

# Listed in the manifest even though the browser cannot display them, so that the
# app can tell the teacher *why* those photos are missing instead of silently
# dropping them here.
REPORT_EXTS = EXTS | {".heic", ".heif"}


def photo_names(folder, exts=EXTS):
    """Image files directly inside *folder*, sorted, hidden files skipped."""
    if not os.path.isdir(folder):
        return []
    names = []
    for name in os.listdir(folder):
        if name.startswith("."):
            continue
        if os.path.splitext(name)[1].lower() in exts:
            names.append(name)
    names.sort(key=lambda n: n.lower())
    return names


def write_students_manifest():
    names = photo_names(STUDENTS_DIR, REPORT_EXTS)
    os.makedirs(STUDENTS_DIR, exist_ok=True)
    path = os.path.join(STUDENTS_DIR, "manifest.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"files": names}, fh, ensure_ascii=False, indent=2)
    return names


def write_demo_manifest():
    names = [n for n in photo_names(DEMO_DIR)]
    path = os.path.join(DEMO_DIR, "demo-manifest.js")
    lines = [
        "/* Auto-generated list of the bundled example portraits.",
        "   Loaded as a plain script (not JSON) so that opening index.html directly",
        "   from the file system works — fetch() is blocked under file://.",
        "",
        "   Regenerate with: python tools/serve.py --manifest-only          */",
        "window.DEMO_FILES = [",
    ]
    lines += ['  "%s",' % n.replace('"', '\\"') for n in names]
    lines.append("];")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    return names


def local_ip():
    """Best-effort LAN address, for typing into a phone browser."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    # Threaded + keep-alive: a single-threaded server stalls the browser, which
    # opens several connections at once for the CSS, scripts and photos.
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):  # noqa: N802  (stdlib naming)
        # Rebuild the manifest on demand so newly added photos show up on reload.
        if self.path.split("?")[0].rstrip("/") == "/students/manifest.json":
            write_students_manifest()
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "manifest.json" in (args[0] if args else ""):
            return
        sys.stderr.write("  %s\n" % (fmt % args))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--manifest-only", action="store_true")
    args = ap.parse_args()

    students = write_students_manifest()
    demo = write_demo_manifest()

    print("  students/ : %d photo(s)" % len(students))
    print("  demo/     : %d photo(s)" % len(demo))

    if args.manifest_only:
        return

    if not students:
        print("\n  students/ is empty — the app will fall back to the demo photos.")
        print("  Drop files named  Vorname_Zweitname_Drittname_Nachname_m_3B.jpg  in there.")

    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    try:
        httpd = http.server.ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    except OSError as exc:
        print("\n  Could not bind port %d: %s" % (args.port, exc))
        print("  Try:  python tools/serve.py --port 8090")
        sys.exit(1)

    print("\n  On this PC :  http://localhost:%d" % args.port)
    print("  On phone   :  http://%s:%d   (same WiFi)" % (local_ip(), args.port))
    print("\n  Ctrl+C to stop.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
