import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, ChatCompletionRequest, ChatCompletionResponse } from '@plexus/types';
import { createAIService } from './ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Hono();
const port = 3000;

// Initialize AI service
const aiService = createAIService();

// Example user data
const user: User = {
  id: '1',
  name: 'John Doe',
};

// API routes
app.get('/api/user', (c) => {
  return c.json(user);
});

// Chat completions endpoint (OpenAI compatible)
app.post('/v1/chat/completions', async (c) => {
  try {
    const request = await c.req.json() as ChatCompletionRequest;
    
    // Validate request
    if (!request.model || !request.messages || !Array.isArray(request.messages)) {
      return c.json({
        error: {
          message: 'Invalid request: model and messages are required',
          type: 'invalid_request_error',
        },
      }, 400);
    }
    
    // Check if streaming is requested
    if (request.stream) {
      // Set up SSE headers for streaming
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      c.header('Access-Control-Allow-Origin', '*');
      
      // Create a readable stream
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiService.createChatCompletionStream(request)) {
              const data = JSON.stringify(chunk);
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
            
            // Send final [DONE] message
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = JSON.stringify({
              error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'internal_error',
              },
            });
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });
      
      return c.body(stream);
    } else {
      // Non-streaming response
      const response = await aiService.createChatCompletion(request);
      return c.json(response);
    }
  } catch (error) {
    console.error('Chat completion error:', error);
    return c.json({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        type: 'internal_error',
      },
    }, 500);
  }
});

// Models endpoint - return available models
app.get('/v1/models', async (c) => {
  const { getEnabledModels } = await import('./config.js');
  const models = getEnabledModels().map(model => ({
    id: model.id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: model.providerIds.join(','),
  }));
  
  return c.json({
    object: 'list',
    data: models,
  });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// Serve frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use('/*', serveStatic({ root: frontendPath }));
app.get('/*', serveStatic({ path: path.join(frontendPath, 'index.html') }));

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on http://localhost:${port}`);
console.log(`OpenAI-compatible endpoints:`);
console.log(`  POST /v1/chat/completions`);
console.log(`  GET /v1/models`);
