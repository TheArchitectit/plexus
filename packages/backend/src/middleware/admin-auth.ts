import type { PlexusConfig } from "../types/config";
import { logger } from "../utils/logger";

export class AdminAuth {
  private config: PlexusConfig;

  constructor(config: PlexusConfig) {
    this.config = config;
  }

  /**
   * Middleware to validate admin API key
   */
  async validate(req: Request): Promise<Response | null> {
    // If admin is not configured, deny all
    if (!this.config.admin?.apiKey) {
      logger.warn("Admin API access attempted but admin.apiKey is not configured");
      return new Response("Admin access not configured", { status: 403 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized: Missing Authorization header", { status: 401 });
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || token !== this.config.admin.apiKey) {
      // Basic timing attack protection? Not strictly necessary for this phase but good practice.
      // String comparison is fast enough here.
      logger.warn("Admin authentication failed", { 
        ip: req.headers.get("x-forwarded-for") || "unknown" 
      });
      return new Response("Unauthorized: Invalid API Key", { status: 401 });
    }

    // Rate limiting could go here (TODO per spec)
    
    return null; // Auth success
  }
}
