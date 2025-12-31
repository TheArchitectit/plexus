# Project Overview

This is a full-stack monorepo project powered entirely by **Bun**. It consists of a React frontend and a Hono backend, leveraging `@musistudio/llms` for advanced LLM routing and virtualization.

- **Frontend:** A React application built natively with Bun (replacing Vite). It features a custom, lightweight development server (`dev-server.ts`) for hot reloading and API proxying.
- **Backend:** A Hono server running on the native `Bun.serve()` runtime. It wraps `@musistudio/llms` to provide a unified API compatible with OpenAI and Anthropic formats.
- **Types:** A shared package for TypeScript types used by both the frontend and backend.

## key Technologies

- **Runtime & Manager:** [Bun](https://bun.sh) (Replaces Node.js, npm, pnpm)
- **Framework:** [Hono](https://hono.dev) (v4, using `hono/bun` adapter)
- **Core Engine:** [`@musistudio/llms`](https://github.com/musistudio/llms) (LLM virtualization and routing)
- **Frontend Build:** Bun Native Build API (`Bun.build`)

## Building and Running

### Prerequisites

- [Bun](https://bun.sh) (v1.0.0 or later)

### Installation

```bash
bun install
```

### Development

To run both the frontend and backend in development mode with hot-reloading:

```bash
bun run dev
```

- **Frontend:** `http://localhost:5173` (Proxies `/api` -> `http://localhost:3000`)
- **Backend:** `http://localhost:3000`

### Build

To build all packages for production:

```bash
bun run build
```

- **Frontend Output:** `packages/frontend/dist`
- **Backend Output:** `packages/backend/dist`

### Running in Production

After building the project, you can start the backend server (which also serves the static frontend):

```bash
bun start
```

## Development Conventions

### Monorepo Structure

The project uses Bun Workspaces:

- `packages/frontend`: The React application.
  - `dev-server.ts`: Custom dev server for HMR and proxying.
  - `build.ts`: Custom production build script.
- `packages/backend`: The Hono backend server.
  - Uses `hono/bun` for maximum performance.
  - Integrates `@musistudio/llms` for model handling.
- `packages/types`: Shared TypeScript types.

### Scripts

- `bun run dev`: Starts the development servers for all packages concurrently.
- `bun run build`: Builds all packages.
- `bun run --filter <package-name> <script>`: Runs a script for a specific package (e.g., `bun run --filter @plexus/frontend lint`).

### Logging

All logging in the backend must use the singleton logger located at `packages/backend/src/utils/logger.ts`.

**Do not use `console.log()`, `console.error()`, or other console methods directly.**

#### Usage

Import the logger in any backend file:

```typescript
import { logger } from "./utils/logger.js";
```

#### Log Levels

Use the appropriate log level based on the message type:

- `logger.debug()`: Detailed debugging information for development
- `logger.info()`: General informational messages (e.g., server status, configuration loaded)
- `logger.warn()`: Warning messages for potentially problematic situations
- `logger.error()`: Error messages for errors and exceptions

#### Features

The logger uses Winston with the following features:

- **Singleton pattern**: ensures one logger instance across the entire backend
- **Debug level**: default logging level for development
- **Colorization**: extensive color coding for different log levels and output
- **Clear formatting**: includes timestamps and support for metadata
- **Console transport**: routes messages to console methods instead of stdout/stderr (useful for debugging tools)

## Architecture Notes

### Frontend Build System
We have removed Vite in favor of a simpler, Bun-native approach:
1.  **Build:** `Bun.build` compiles the React app.
2.  **Serve:** A custom script (`packages/frontend/dev-server.ts`) handles serving files and proxying API requests to the backend during development.

### Backend LLM Integration
The backend serves as a control plane for `@musistudio/llms`.
- **Initialization:** The `LLMServerInstance` initializes the core engine using configurations loaded from `config/`.
- **Routing:** Hono routes (e.g., `/v1/chat/completions`) intercept requests and inject them into the `@musistudio/llms` instance using Fastify's `.inject()` method (as the core library is based on Fastify).
