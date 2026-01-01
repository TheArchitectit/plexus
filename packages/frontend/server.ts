import { serve } from "bun";
import { join } from "path";
import { existsSync } from "fs";

const PORT = 3000;
const API_URL = "http://localhost:4000";
const DIST = join(import.meta.dir, "dist");

if (!existsSync(DIST)) {
    console.error("dist folder not found. Run 'bun run build' first.");
    process.exit(1);
}

console.log(`Serving frontend at http://localhost:${PORT}`);
console.log(`Proxying API requests to ${API_URL}`);

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Proxy API requests
    if (path.startsWith("/v0/") || path.startsWith("/v1/") || path.startsWith("/health")) {
        const targetUrl = new URL(path, API_URL);
        targetUrl.search = url.search;
        
        const headers = new Headers(req.headers);
        headers.set("Host", targetUrl.host);
        
        console.log(`Proxying ${req.method} ${path} to ${targetUrl.toString()}`);
        
        try {
            const response = await fetch(targetUrl.toString(), {
                method: req.method,
                headers: headers,
                body: req.body,
            });
            return response;
        } catch (e) {
            console.error("Proxy error:", e);
            return new Response("Backend unavailable", { status: 502 });
        }
    }

    // Default to index.html
    if (path === "/" || path === "") {
        return new Response(Bun.file(join(DIST, "index.html")));
    }

    // Try finding the file
    let filePath = join(DIST, path);
    let file = Bun.file(filePath);
    
    if (await file.exists()) {
        return new Response(file);
    }
    
    // For SPA routing, if not a file extension, return index.html
    if (!path.includes(".")) {
        return new Response(Bun.file(join(DIST, "index.html")));
    }

    return new Response("Not found", { status: 404 });
  },
});
