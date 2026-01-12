# @musistudio/llms Library Export Suggestions

## Problem

The `@musistudio/llms` package is currently structured as a server application, not a consumable library. The `package.json` only exports the bundled server entry points:

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/server.mjs",
      "require": "./dist/cjs/server.cjs"
    }
  }
}
```

This means consumers cannot import the transformers or types directly. To use the transformation functionality, consumers must either:
1. Clone the entire repository and import from source files
2. Set up path aliases to resolve `@/` imports
3. Install peer dependencies manually

## Use Case

When building an API gateway like Plexus that needs to transform between OpenAI and Anthropic formats, we need access to:

```typescript
// What we want to do:
import { AnthropicTransformer, OpenAITransformer } from "@musistudio/llms";
import type { Transformer, UnifiedChatRequest } from "@musistudio/llms";

const anthropic = new AnthropicTransformer();
const unified = await anthropic.transformRequestOut(anthropicRequest, context);
```

## Proposed Solution

### 1. Create a library entry point (`src/index.ts`)

```typescript
// =============================================================================
// Types - Essential for consumers to use the transformers correctly
// =============================================================================
export type {
  // Core transformer interface
  Transformer,
  TransformerContext,
  TransformerOptions,
  TransformerConstructor,
} from "./types/transformer";

export type {
  // Unified request/response types (the "lingua franca" of the library)
  UnifiedChatRequest,
  UnifiedChatResponse,
  UnifiedMessage,
  UnifiedTool,
  
  // Content types
  MessageContent,
  TextContent,
  ImageContent,
  
  // Provider configuration
  LLMProvider,
  ConfigProvider,
  
  // Streaming types
  StreamChunk,
  AnthropicStreamEvent,
  OpenAIStreamChunk,
} from "./types/llm";

// =============================================================================
// Transformers - Named exports for tree-shaking
// =============================================================================

// Core provider transformers
export { OpenAITransformer } from "./transformer/openai.transformer";
export { AnthropicTransformer } from "./transformer/anthropic.transformer";
export { GeminiTransformer } from "./transformer/gemini.transformer";

// Vertex AI variants
export { VertexGeminiTransformer } from "./transformer/vertex-gemini.transformer";
export { VertexClaudeTransformer } from "./transformer/vertex-claude.transformer";
export { VertexOpenaiTransformer } from "./transformer/vertex-openai.transformer";

// Provider-specific transformers
export { DeepseekTransformer } from "./transformer/deepseek.transformer";
export { GroqTransformer } from "./transformer/groq.transformer";
export { CerebrasTransformer } from "./transformer/cerebras.transformer";
export { OpenrouterTransformer } from "./transformer/openrouter.transformer";
export { VercelTransformer } from "./transformer/vercel.transformer";

// OpenAI Responses API
export { OpenAIResponsesTransformer } from "./transformer/openai.responses.transformer";

// Utility/middleware transformers
export { MaxTokenTransformer } from "./transformer/maxtoken.transformer";
export { MaxCompletionTokens } from "./transformer/maxcompletiontokens.transformer";
export { SamplingTransformer } from "./transformer/sampling.transformer";
export { StreamOptionsTransformer } from "./transformer/streamoptions.transformer";
export { ReasoningTransformer } from "./transformer/reasoning.transformer";
export { ForceReasoningTransformer } from "./transformer/forcereasoning.transformer";
export { TooluseTransformer } from "./transformer/tooluse.transformer";
export { EnhanceToolTransformer } from "./transformer/enhancetool.transformer";
export { CleancacheTransformer } from "./transformer/cleancache.transformer";
export { CustomParamsTransformer } from "./transformer/customparams.transformer";
export { ExtraThinkTagTransformer } from "./transformer/extrathinktag.transformer";

// =============================================================================
// Default export - All transformers as an object (for dynamic access)
// =============================================================================
export { default as Transformers } from "./transformer/index";
```

### 2. Update `package.json`

```json
{
  "name": "@musistudio/llms",
  "version": "1.0.54",
  "description": "A universal LLM API transformation library and server",
  "main": "dist/cjs/index.cjs",
  "module": "dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
  "type": "module",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.mjs"
      },
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.cjs"
      }
    },
    "./server": {
      "import": "./dist/esm/server.mjs",
      "require": "./dist/cjs/server.cjs"
    }
  },
  "typesVersions": {
    "*": {
      "*": ["./dist/esm/index.d.ts"],
      "server": ["./dist/esm/server.d.ts"]
    }
  },
  "files": [
    "dist"
  ]
}
```

### 3. Update build script

The build script (`scripts/build.ts`) needs to:
1. Build `src/index.ts` as the main library entry point
2. Build `src/server.ts` as a separate server entry point
3. Generate TypeScript declaration files (`.d.ts`)

Key build configuration additions:
```typescript
// For library build
{
  entryPoints: ["src/index.ts"],
  outfile: "dist/esm/index.mjs",
  // ... other options
}

// Enable declaration generation in tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false
  }
}
```

## Usage After Changes

### Importing specific transformers (tree-shakeable)

```typescript
import { 
  AnthropicTransformer, 
  OpenAITransformer,
  GeminiTransformer 
} from "@musistudio/llms";

import type { 
  Transformer, 
  TransformerContext,
  UnifiedChatRequest,
  UnifiedMessage
} from "@musistudio/llms";

// Create transformer instances
const anthropic = new AnthropicTransformer();
const openai = new OpenAITransformer();

// Transform Anthropic request to unified format
const unified = await anthropic.transformRequestOut(request, context);

// Transform response back to Anthropic format
const response = await anthropic.transformResponseIn(providerResponse, context);
```

### Importing all transformers as an object

```typescript
import { Transformers } from "@musistudio/llms";

// Dynamic transformer selection
const TransformerClass = Transformers[`${providerName}Transformer`];
const transformer = new TransformerClass();
```

### Running the server (unchanged)

```typescript
// Server functionality remains available via subpath
import "@musistudio/llms/server";

// Or via CLI
npx @musistudio/llms
```

## Benefits

1. **Tree-shaking** - Named exports allow bundlers to eliminate unused transformers
2. **TypeScript support** - Proper type exports enable IDE autocompletion and type checking
3. **Flexibility** - Consumers can use just the transformers without the server
4. **Backward compatible** - Server functionality remains available via `/server` subpath
5. **Standard patterns** - Follows common library export conventions

## Minor Code Changes Needed

### OpenAITransformer

Add explicit `logger` property to match other transformers:

```typescript
// src/transformer/openai.transformer.ts
export class OpenAITransformer implements Transformer {
  name = "OpenAI";
  endPoint = "/v1/chat/completions";
  logger?: any;  // Add this line
}
```

This ensures consistency with other transformers that use the logger for debugging.
