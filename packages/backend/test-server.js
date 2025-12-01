// Simple test script to verify backend functionality
import express from 'express';
import cors from 'cors';

// Mock the AI SDK imports since we can't run the full TypeScript build
const mockChatCompletion = async (request) => {
  console.log('Mock chat completion request:', request);
  return {
    id: 'mock-response',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: request.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `Hello! I received your message about: "${request.messages[request.messages.length - 1]?.content || 'test'}"`,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
};

const app = express();
const port = 3001; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Models endpoint
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'gpt-4o',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'openai-primary',
      },
      {
        id: 'gpt-3.5-turbo',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'openai-primary',
      },
    ],
  });
});

// Chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, stream } = req.body;
    
    // Basic validation
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: model and messages are required',
          type: 'invalid_request_error',
        },
      });
    }
    
    if (stream) {
      // Set up SSE headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Mock streaming response
      const mockResponse = await mockChatCompletion(req.body);
      const chunks = mockResponse.choices[0].message.content.split(' ');
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = {
          id: mockResponse.id,
          object: 'chat.completion.chunk',
          created: mockResponse.created,
          model: model,
          choices: [
            {
              index: 0,
              delta: {
                role: i === 0 ? 'assistant' : undefined,
                content: chunks[i] + ' ',
              },
              finish_reason: null,
            },
          ],
        };
        
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        
        // Simulate delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Send final [DONE] message
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const response = await mockChatCompletion(req.body);
      res.json(response);
    }
  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error',
      },
    });
  }
});

app.listen(port, () => {
  console.log(`Mock AI server running on http://localhost:${port}`);
  console.log(`Test endpoints:`);
  console.log(`  POST http://localhost:${port}/v1/chat/completions`);
  console.log(`  GET http://localhost:${port}/v1/models`);
  console.log(`  GET http://localhost:${port}/health`);
});