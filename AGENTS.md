# AGENTS.md - Plexus Development Guide

> **Last Updated:** Auto-generated for AI agents working in the Plexus codebase  
> **Project:** Plexus - Unified LLM API Gateway  
> **Stack:** Bun + TypeScript + Fastify + React + Drizzle ORM

---

## Quick Start

```bash
# Install dependencies for all workspaces
bun run install:all

# Start full development stack (backend + frontend)
bun run dev

# Backend only (port 4000)
bun run dev:backend

# Frontend only (builds to dist/)
bun run dev:frontend
```

---

## Project Overview

**Plexus** is a high-performance, unified API gateway and virtualization layer for Large Language Models (LLMs). It abstracts the complexity of integrating with multiple AI providers (OpenAI, Anthropic, Google, etc.) by transforming incoming APIs.

### Key Capabilities
- **Unified API Surface:** Single endpoint that routes to any provider
- **Protocol Transformation:** Converts between OpenAI, Anthropic, and other formats
- **Load Balancing:** Multiple targets per model alias with randomized distribution
- **Usage Tracking:** Cost calculation and request logging
- **Quota Management:** Provider cooldowns and quota checking

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh) |
| Backend Framework | Fastify |
| Frontend Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Drizzle ORM |
| Database | SQLite (default) / PostgreSQL (production) |
| Validation | Zod |
| Testing | Bun test runner |

---

## Monorepo Structure

```
plexus/
├── packages/
│   ├── backend/          # Fastify API server
│   │   ├── src/
│   │   │   ├── services/     # Core business logic
│   │   │   ├── transformers/ # API protocol converters
│   │   │   ├── routes/       # HTTP route handlers
│   │   │   ├── types/        # TypeScript type definitions
│   │   │   ├── utils/        # Shared utilities
│   │   │   ├── db/           # Database client
│   │   │   └── drizzle/      # Schema + migrations
│   │   └── test/         # Test files + global setup
│   └── frontend/         # React dashboard
│       ├── src/
│       │   ├── pages/        # Route components
│       │   ├── components/   # Reusable UI components
│       │   ├── lib/          # API client + utilities
│       │   └── assets/       # Static files (images, etc.)
│       └── dist/         # Build output (generated)
├── config/
│   └── plexus.yaml       # Main configuration file
├── scripts/
│   └── dev.ts            # Dev server orchestrator
└── package.json          # Root workspace config
```

---

## Essential Commands

### Development
```bash
# Full stack development (recommended)
bun run dev

# Backend only (runs on port 4000)
cd packages/backend && bun run dev

# Frontend only (watch mode)
cd packages/frontend && bun run dev

# Type checking (all workspaces)
bun run typecheck
```

### Testing
```bash
# Run all tests
cd packages/backend && bun test

# Watch mode
cd packages/backend && bun run test:watch

# Tests preload setup.ts automatically (see bunfig.toml)
```

### Building
```bash
# Build frontend for production
cd packages/frontend && bun run build

# Compile to standalone binary (all platforms)
bun run compile:linux      # plexus-linux
bun run compile:macos    # plexus-macos  
bun run compile:windows  # plexus.exe

# Build all + compile single binary
bun run build:bin
```

### Database (Drizzle)
```bash
cd packages/backend

# Generate migrations (SQLite)
bunx drizzle-kit generate

# Generate migrations (PostgreSQL)
bunx drizzle-kit generate --config drizzle.config.pg.ts

# Apply migrations manually (usually auto-applied on startup)
bunx drizzle-kit migrate
```

---

## Code Patterns & Conventions

### Backend (Fastify)

#### Service Pattern
Services are singleton classes with clear responsibilities:

```typescript
// packages/backend/src/services/example-service.ts
import { logger } from '../utils/logger';

export class ExampleService {
  private static instance: ExampleService;
  
  private constructor() {}
  
  static getInstance(): ExampleService {
    if (!ExampleService.instance) {
      ExampleService.instance = new ExampleService();
    }
    return ExampleService.instance;
  }
  
  async doSomething(): Promise<void> {
    logger.info('Doing something');
  }
}
```

#### Transformer Pattern
Transformers convert between API formats:

```typescript
// packages/backend/src/transformers/
export class SomeTransformer implements Transformer {
  name = "provider-name";
  defaultEndpoint = "/v1/chat/completions";

  async parseRequest(input: any): Promise<UnifiedChatRequest> {
    // Convert incoming to unified format
  }

  async transformRequest(request: UnifiedChatRequest): Promise<any> {
    // Convert unified to provider format
  }

  async transformResponse(response: any): Promise<UnifiedChatResponse> {
    // Convert provider response to unified
  }
}
```

#### Route Registration
Routes are registered in `index.ts` via dedicated functions:

```typescript
// packages/backend/src/routes/inference/index.ts
export async function registerInferenceRoutes(
  fastify: FastifyInstance,
  dispatcher: Dispatcher,
  usageStorage: UsageStorageService
) {
  fastify.post('/v1/chat/completions', async (request, reply) => {
    // Handler logic
  });
}
```

### Frontend (React)

#### Component Structure
```typescript
// Functional components with explicit types
import React from 'react';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

export const ComponentName: React.FC<ComponentProps> = ({ title, onAction }) => {
  return (
    <div className="tailwind-classes-here">
      {title}
    </div>
  );
};
```

#### API Client Pattern
```typescript
// packages/frontend/src/lib/api.ts
const API_BASE = '/v0';

export async function fetchData(): Promise<DataType> {
  const response = await fetch(`${API_BASE}/endpoint`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

#### Styling Guidelines
- **Tailwind v4** is used for all styling
- **CRITICAL:** Never import `globals.css` into TS/TSX files - Bun's CSS loader breaks Tailwind v4 directives
- Use `clsx` for conditional classes: `clsx('base', condition && 'conditional')`
- Static assets go in `packages/frontend/src/assets/`
- Import assets: `import logo from '../assets/logo.svg'` (not dynamic paths)

#### Formatting Utilities (ALWAYS USE THESE)
```typescript
import { formatCost, formatMs, formatTPS, formatDuration, formatTokens } from '../lib/format';

// Numbers: "1.3k", "2.5M"
formatTokens(1234);  // "1.2k"

// Costs: "$0.001234"
formatCost(0.001234);  // "$0.001"

// Duration: "2h 30m", "3mo 2w"
formatDuration(9000);  // "2h 30m"

// Time: "45ms", "2.5s"
formatMs(2500);  // "2.5s"
```

---

## Testing Guidelines

### Global Test Setup
- **File:** `packages/backend/test/setup.ts`
- **Config:** `bunfig.toml` preloads this before all tests
- Handles logger mocking and database initialization

### Mocking Rules (CRITICAL)
Bun's `mock.module` is **process-global** and cannot be undone with `mock.restore()`.

```typescript
// ✅ CORRECT: Use spyOn for existing mocks
import { logger } from "src/utils/logger";
import { spyOn } from "bun:test";

const infoSpy = spyOn(logger, "info");
expect(infoSpy).toHaveBeenCalled();

// ❌ WRONG: Don't re-mock modules that are already mocked in setup.ts
// This causes "TypeError: logger.info is not a function"
mock.module("src/utils/logger", () => ({ ... }));

// ✅ If you MUST mock a module, implement ALL methods:
mock.module("some/module", () => ({
  method1: mock(),
  method2: mock(),
  // ... every exported function
}));
```

### Test Database
- Uses SQLite in-memory by default: `sqlite://:memory:`
- Override with: `PLEXUS_TEST_DB_URL=sqlite://:memory:`
- Migrations run automatically via setup.ts

---

## Database Migrations (CRITICAL)

### NEVER Do These
- ❌ Edit existing migration files
- ❌ Manually create `.sql` migration files
- ❌ Edit `meta/_journal.json`
- ❌ Modify live database directly with SQL

### CORRECT Workflow
1. **Edit schema** in `drizzle/schema/sqlite/` or `drizzle/schema/postgres/`
2. **Generate migrations:**
   ```bash
   # SQLite
   bunx drizzle-kit generate
   
   # PostgreSQL (also needed!)
   bunx drizzle-kit generate --config drizzle.config.pg.ts
   ```
3. **Review** generated SQL files
4. **Test** by restarting server
5. **Commit** all files (SQL + journal)

---

## Configuration

### Main Config: `config/plexus.yaml`
```yaml
providers:
  openai:
    base_url: "https://api.openai.com"
    api_key: "${OPENAI_API_KEY}"

models:
  gpt-4o:
    aliases: ["gpt-4", "4o"]
    provider: openai
    model_id: "gpt-4o"

keys:
  admin-key-here:
    models: ["*"]
```

### Environment Variables
- `PORT` - Server port (default: 4000)
- `PLEXUS_DB_URL` - Database connection string
- `DEBUG=true` - Enable debug logging
- `APP_VERSION` - Version string for builds

---

## Important Gotchas

### Frontend CSS Build
- **Tailwind v4** uses `@source` directives in `globals.css`
- **Do NOT** import CSS files into TypeScript - build.ts handles linking
- Build outputs to `packages/frontend/dist/main.css`

### Import Paths
Backend uses relative imports from `src/`:
```typescript
// ✅ CORRECT
import { logger } from './utils/logger';
import { Transformer } from '../types/transformer';

// ❌ WRONG - no path aliases configured
import { logger } from '@/utils/logger';
```

### Error Handling
Always use the global error handler pattern:
```typescript
fastify.setErrorHandler((error, request, reply) => {
  if (reply.sent) return;  // Prevent double-send
  
  logger.error('Error', error);
  reply.code(500).send({
    error: { message: error.message, type: "api_error" }
  });
});
```

### Streaming Responses
For SSE streaming, use the eventsource-parser/encoder packages:
```typescript
import { createParser } from "eventsource-parser";
import { encode } from "eventsource-encoder";
```

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Services | `*.service.ts` or descriptive | `dispatcher.ts` |
| Transformers | `*.ts` in transformers/ | `anthropic.ts` |
| Routes | `*.ts` in routes/ | `inference.ts` |
| Types | `*.ts` in types/ | `unified.ts` |
| Tests | `*.test.ts` | `pricing_config.test.ts` |
| React Components | PascalCase | `Dashboard.tsx` |
| Utilities | camelCase | `format.ts` |

---

## Useful References

- **Entry Points:**
  - Backend: `packages/backend/src/index.ts`
  - Frontend: `packages/frontend/src/main.tsx`
  
- **Key Files:**
  - Config: `packages/backend/src/config.ts`
  - Logger: `packages/backend/src/utils/logger.ts`
  - API Client: `packages/frontend/src/lib/api.ts`
  - Format Utils: `packages/frontend/src/lib/format.ts`

- **External Docs:**
  - [Bun Runtime](https://bun.sh)
  - [Fastify](https://fastify.dev)
  - [Drizzle ORM](https://orm.drizzle.team)
  - [Zod](https://zod.dev)
  - [Tailwind CSS v4](https://tailwindcss.com)

---

## Release Process

1. Update `CHANGELOG.md` with version details
2. Create git tag: `git tag v1.x.x`
3. Push tag: `git push origin v1.x.x`
4. GitHub Actions builds binaries + Docker image automatically
5. Release published with notes from CHANGELOG

---

## Emergency Contacts

If you break something:
1. Check existing tests: `bun test`
2. Review recent migrations: `drizzle/migrations/`
3. Check logs: `DEBUG=true bun run dev`
4. Reset database: Delete `config/usage.sqlite` (dev only!)
