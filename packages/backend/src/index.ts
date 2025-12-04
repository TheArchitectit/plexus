import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { bearerAuth } from "hono/bearer-auth";
import path from "path";
import { fileURLToPath } from "url";
import {
  chatCompletionRequestSchema,
  errorResponseSchema,
  VirtualKeyConfig,
  ProviderType,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
} from "@plexus/types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { configLoader } from "./config/loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Hono();
const port = 3000;


async function initializeApp() {
  try {
    // Load configuration
    const configSnapshot = await configLoader.loadConfiguration();

    console.log("Configuration loaded successfully");
    console.log(`Loaded ${configSnapshot.providers.size} providers`);
    console.log(`Loaded ${configSnapshot.virtualKeys.size} virtual keys`);
    console.log(`Loaded ${configSnapshot.models.size} models`);
  } catch (error) {
    console.error("Failed to initialize application:", error);
  }
}

// Error handling middleware (must be first)
app.onError((err, c) => {
  console.error("Unhandled error:", err);

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return c.json({ error: "Invalid request", details: err.issues }, 400);
  }

  // Handle Hono's HTTPException from bearer auth
  if (err.name === "HTTPException") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ error: "Internal Server Error" }, 500);
});

// Basic logging middleware
app.use("*", async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`);
  await next();
});

// Authentication middleware for /v1/chat/completions
const authMiddleware = bearerAuth({ token: "virtual-key" });

// Chat Completion Endpoint
app.post(
  "/v1/chat/completions",
  authMiddleware,
  zValidator("json", chatCompletionRequestSchema),
  async (c) => {
    const { messages, model, temperature } = c.req.valid("json");

  }
);



// Helper function to transform ModelConfig to ModelInfo
function transformModelConfigToModelInfo(
  modelName: string,
  modelConfig: any
): ModelInfo {
  return {
    id: modelName,
    canonical_slug: modelName, // Using the model name as canonical slug for now
    name: modelConfig.name,
    context_length: modelConfig.contextWindow || modelConfig.maxTokens || 4096,
    pricing: {
      prompt: modelConfig.inputTokenPrice?.toString() || "0.0",
      completion: modelConfig.outputTokenPrice?.toString() || "0.0",
    },
    provider: modelConfig.provider,
  };
}

// Models endpoint - no authentication required
app.get("/v1/models", async (c) => {
  try {
    const configSnapshot = configLoader.getSnapshot();

    if (!configSnapshot) {
      return c.json([], 200);
    }

    // Transform all models to the required format
    const models: ModelInfo[] = [];

    for (const [modelName, modelConfig] of configSnapshot.models) {
      try {
        const modelInfo = transformModelConfigToModelInfo(
          modelName,
          modelConfig
        );
        models.push(modelInfo);
      } catch (error) {
        console.warn(`Failed to transform model ${modelName}:`, error);
      }
    }

    return c.json(models);
  } catch (error) {
    console.error("Models endpoint error:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to get models",
      },
      500
    );
  }
});

// Configuration status endpoint
app.get("/api/config/status", async (c) => {
  try {
    const configStatus = configLoader.getStatus();
    return c.json({
      configuration: configStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get configuration status",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Configuration reload endpoint
app.post("/api/config/reload", async (c) => {
  try {
    const newConfig = await configLoader.reloadConfiguration();
    const configStatus = configLoader.getStatus();

    return c.json({
      message: "Configuration reloaded successfully",
      configuration: configStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reload configuration",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Serve frontend
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use("/*", serveStatic({ root: frontendPath }));
app.get("/*", serveStatic({ path: path.join(frontendPath, "index.html") }));

// Initialize the application
initializeApp()
  .then(() => {
    serve({
      fetch: app.fetch,
      port,
    });

    console.log(`Server is running on http://localhost:${port}`);
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
