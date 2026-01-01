import { serve } from "bun";
import index from "./index.html";

const PORT = 3000;
const API_URL = "http://localhost:4000";

console.log(`🌐 Frontend Dev Server: http://localhost:${PORT}`);
console.log(`🔌 Proxying API to: ${API_URL}`);

serve({
  port: PORT,
  development: true,
  routes: {
    "/": index,
  },
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path.startsWith("/v0/") || path.startsWith("/v1/") || path.startsWith("/health")) {
      const targetUrl = new URL(path, API_URL);
      targetUrl.search = url.search;
      try {
        return await fetch(targetUrl, {
            method: req.method,
            headers: req.headers,
            body: req.body,
        });
      } catch (e) {
        return new Response("Backend unavailable", { status: 502 });
      }
    }
    
    // SPA Fallback
    if (!path.includes(".")) {
        return new Response(index);
    }
    
    return new Response("Not Found", { status: 404 });
  },
});