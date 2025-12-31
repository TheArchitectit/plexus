## 1. Executive Summary
**Plexus** is a high-performance, unified API gateway and virtualization layer for Large Language Models (LLMs). Built on the **Bun** runtime, it abstracts the complexity of integrating with multiple AI providers (OpenAI, Anthropic, Google, etc.) by transforming incoming APIs (`/v1/messages`, `/v1/chat/completions`, `/v1/responses`, etc). This enables developers to switch providers, load-balance requests, and manage model configurations without altering their client application code.

## 2. Target Audience
- **AI Engineers & Developers:** Building applications that consume LLM APIs and require flexibility in provider selection.
- **Platform Architects:** Seeking to unify LLM traffic through a centralized, controllable gateway.

## Goal
The whole point is that I can send a request on any of the supported APIs in their relevant format:

/v1/chat/completions #openai chat completions style
/v1/messages #anthropic messages style
/v1/responses #open ai responses style

With a model of any choice, regardless of the backend provider type (chat, messages, etc).

The application needs to accept that request:

1. select the targeted provider (regardless of type).
2. Determine the type of API needed (responses, chat, messages) for that provider, base on the type: field
3. tranform the request into the API needed
4. Make the request to the target API and target endpoint
5. Transform the response back into the desired format (based on the input format).

For example.  If I have a 2 providers - oone called 'providerB' that is of type: anthropic with a model called 'minimax-m2.1', and I make a request on /v1/chat/completions, here's what needs to happen:

1. Receive request.
2. Parse request as /v1/chat/completions style, possibly into UnifiedRequest type, but its up to you.  Note that the request 'style' is chat completions style.
3. Select the 'providerB', and note that the type is 'anthropic'
4. Convert the request to anthropic messages style
5. Make the request to the appropriate endpoint (/v1/messages) in the anthropic messages style
6. Receive the response, and convert it back to chat completions style back to the client.

This needs to work for any combination of supported types.

## 3. Core Features & Capabilities

### 3.1 Unified API Surface

- **Endpoints:**
  - `POST /v1/chat/completions`: Accepts standard chat completion requests, handles routing, transformation, and returns standardized responses.
  - `POST /v1/messages`: Accepts standard anthropic requests, handles routing, transformation, and returns standardized responses.
  - `POST /v1/responses`: Accepts standard openai responses api requests, handles routing, transformation, and returns standardized responses.
  - `GET /v1/models`: (Architecture supports) Lists available models configured in the system.

### 3.2 Advanced Routing & Virtualization
- **Model Aliasing:** Decouples the requested model ID (e.g., `my-coding-model`) from the actual provider implementation (e.g., `claude-3-5-sonnet-20240620`).  Review packages/backend/src/config.ts and config/ for samples.
- **Load Balancing:** Supports configuring multiple providers for a single model alias. Requests are distributed (randomized) across available providers to ensure high availability.
- **Canonical Mapping:** Automatically translates internal model aliases to the specific "slug" required by the upstream provider.

### 3.3 Multi-Provider Support
Leverages a robust "Transformer" architecture to support a wide array of upstream providers:
- **Major Providers:** OpenAI, Anthropic, Google (Gemini/Vertex), Deepseek, Groq, Cerebras.
- **Aggregators:** OpenRouter, Vercel.
- **Specialized Handling:**
  - **Streaming:** Transparent support for Server-Sent Events (SSE) for real-time responses.
  - **Tool Use:** Normalizes function calling/tool use across different provider implementations.
  - **Reasoning:** Adapters for specific reasoning models/parameters.

### 3.4 Operational Features
- **Centralized Configuration:** Driven by a structured configuration system (located in `config/`) that defines providers, models, and routing rules.
- **Logging:** Structured, singleton logging (via Winston) for request tracing and debugging.
- **Web Server:** Use hono as the web server, with its Bun integration.

## 4. Technical Architecture

### 4.1 Stack
- **Runtime:** [Bun](https://bun.sh) (JavaScript runtime & package manager).
- **Web Framework:** Hono

### 4.2 System Components
- **`packages/backend`**: The primary Hono server application. Handles HTTP requests, authentication (placeholder), configuration loading, and request dispatching.
- **`packages/frontend`**: A React-based web application. *Current Status: Boilerplate/Placeholder.* Intended for future management dashboard (monitoring, config editing).


## 6. Assumptions & Dependencies
- Requires a properly populated `config/` directory to function (currently empty/gitkept in the file list).

There is sample code in llms/ that can be used to inform you as to how to do some of these transformations.  It should not be used directly, but as a GUIDE on implementing it yourself.

Make sure to strong types extensively.

There is a test script in testcommands/test_request.ts, along with test files in testcommands/chat and testcommands/messages that you can use as input tests.