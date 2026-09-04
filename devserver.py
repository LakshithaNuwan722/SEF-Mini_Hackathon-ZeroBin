"""Tiny static server for local development.

Identical to `python -m http.server` except it tells the browser never to cache
anything. Without that, edited ES modules keep being served from the browser's
heuristic cache and you end up debugging code that is no longer on disk.

Production hosting (Vercel / Firebase / Netlify) serves the same files with
sensible caching of its own; this is only for `python devserver.py`.
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the console quiet
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    print(f"ZeroBin dev server: http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
