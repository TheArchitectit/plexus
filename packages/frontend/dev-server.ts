import { serve, file } from "bun";
import { cp, mkdir, rm } from "fs/promises";
import path from "path";

const OUT_DIR = "./dist";
const ENTRY_POINT = "./src/main.tsx";
const PORT = 5173;
const BACKEND_URL = "http://localhost:3000";

// Initial Build Function
async function buildApp() {
    console.log("Building app...");
    // Clean output directory
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });

    // Build the application
    const result = await Bun.build({
        entrypoints: [ENTRY_POINT],
        outdir: OUT_DIR,
        minify: false,
        sourcemap: "inline",
        naming: "[name].[ext]",
    });

    if (!result.success) {
        console.error("Build failed");
        for (const message of result.logs) {
            console.error(message);
        }
        return false;
    }

    // Copy public assets
    const publicDir = "./public";
    if (await file(publicDir).exists()) {
        await cp(publicDir, OUT_DIR, { recursive: true });
    }

    // Handle index.html
    let html = await file("./index.html").text();
    
    // Inject script
    html = html.replace(
        /<script type="module" src="\/src\/main.tsx"><\/script>/,
        '<script type="module" src="/main.js"></script>'
    );

    // Inject CSS if exists
    const cssFile = result.outputs.find(output => output.path.endsWith(".css"));
    if (cssFile) {
        const cssName = path.basename(cssFile.path);
        html = html.replace(
            /\/head>/,
            `<link rel="stylesheet" href="/${cssName}">\n  </head>`
        );
    }

    await Bun.write(path.join(OUT_DIR, "index.html"), html);
    console.log("Build complete.");
    return true;
}

// Perform initial build
await buildApp();

// Simple Watcher (Rebuild on change)
// In a real scenario, we might want to use Bun.build --watch, but integrating that with custom index.html handling is tricky.
// We'll just watch the src folder.
import { watch } from "fs";

console.log("Starting watcher on ./src");
const watcher = watch("./src", { recursive: true }, async (event, filename) => {
  console.log(`Detected change in ${filename}. Rebuilding...`);
  await buildApp();
});


serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

        // Proxy /api requests to backend
        if (url.pathname.startsWith("/api")) {
            console.log(`Proxying ${url.pathname} to backend`);
            const backendUrl = new URL(url.pathname + url.search, BACKEND_URL);
            
            // Forward the request
            // Note: We need to clone the request init but override the URL
            // Headers are important for auth
            try {
                const proxyReq = new Request(backendUrl, {
                    method: req.method,
                    headers: req.headers,
                    body: req.body,
                    duplex: "half" // Required for streaming bodies in newer fetch standards
                } as any);
                
                const response = await fetch(proxyReq);
                return response;
            } catch (e) {
                console.error("Proxy error:", e);
                return new Response("Backend unavailable", { status: 502 });
            }
        }

        // Serve static files
        let filePath = path.join(OUT_DIR, url.pathname);
        
        // Default to index.html for root
        if (url.pathname === "/") {
            filePath = path.join(OUT_DIR, "index.html");
        }

        let f = file(filePath);
        
        // If file doesn't exist, and it's not an asset (no extension), serve index.html for SPA routing
        if (!(await f.exists()) && !path.extname(url.pathname)) {
            f = file(path.join(OUT_DIR, "index.html"));
        }

        if (await f.exists()) {
            return new Response(f);
        }

        return new Response("Not found", { status: 404 });
    }
});

console.log(`Frontend server running at http://localhost:${PORT}`);
