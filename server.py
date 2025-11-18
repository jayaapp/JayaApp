
# Minimal HTTP server for local PWA testing
import http.server
import socketserver

PORT = 8000

if __name__ == "__main__":
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🚀 Serving at http://localhost:{PORT}/index.html")
        print("📂 Make sure your files are in the same directory as this script.")
        print("🔗 Open the link in your browser.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")


