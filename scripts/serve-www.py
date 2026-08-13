# Serves the built www/ bundle for local testing.
#
# Why this exists rather than `python3 -m http.server --directory www`: that form resolves its default
# from os.getcwd(), which raises PermissionError under a sandboxed launcher before it ever binds a port.
# Resolving the directory from THIS file's location instead is both sandbox-safe and independent of
# wherever the server happens to be started from.
#
# Port 8791, matching the "native-bundle" entry in .claude/launch.json.
import functools
import http.server
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www')
ROOT = os.path.normpath(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet: the app's own console output is what matters when debugging

    def end_headers(self):
        # Never let a stale bundle be tested — this is a build output that changes constantly.
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    print('serving %s on http://127.0.0.1:8791' % ROOT, flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1', 8791), handler).serve_forever()
