
# Minimal HTTP server for local PWA testing
import http.server
import socketserver

PORT = 8000

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that adds headers to prevent caching.

    This is convenient during development so edits to static files
    (like `data/locale.json`) are always fetched fresh by the browser.
    """

    def end_headers(self):
        # Tell clients and intermediate caches not to store responses
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    Handler = NoCacheHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🚀 Serving at http://localhost:{PORT}/index.html (no-cache mode)")
        print("📂 Make sure your files are in the same directory as this script.")
        print("🔗 Open the link in your browser.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")