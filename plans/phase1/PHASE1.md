# Phase 1: Foundation & Project Setup

## Objective
Establish the core project structure, development environment, and foundational infrastructure required for all subsequent phases. This phase delivers a running Bun server with basic health endpoints and a validated configuration system.

---

## Success Criteria
- [ ] Bun-based HTTP server starts and responds to requests on port 4000
- [ ] Health check endpoint returns valid JSON response
- [ ] Configuration file loads and validates successfully
- [ ] Project structure follows monorepo conventions
- [ ] All development tooling configured and functional
- [ ] Basic test infrastructure in place with passing tests

---

## Deliverables

### 1. Project Structure
```
plexus2/
├── packages/
│   └── backend/
│       ├── src/
│       │   ├── index.ts              # Server entry point
│       │   ├── server.ts             # HTTP server setup
│       │   ├── config.ts             # Configuration loading
│       │   ├── routes/
│       │   │   └── health.ts         # Health check route
│       │   ├── services/             # Business logic (empty for now)
│       │   ├── types/
│       │   │   └── config.ts         # Configuration type definitions
│       │   └── utils/
│       │       └── logger.ts         # Logging utility
│       ├── tests/
│       │   ├── setup.ts              # Test setup and mocks
│       │   ├── config.test.ts        # Configuration tests
│       │   └── health.test.ts        # Health endpoint tests
│       ├── package.json
│       └── tsconfig.json
├── config/
│   └── plexus.yaml                   # Main configuration file
├── plans/                            # Phase documentation
├── package.json                      # Root package.json
├── bunfig.toml                       # Bun configuration
└── tsconfig.json                     # Root TypeScript config
```

### 2. Configuration Schema (Initial)
The configuration file should support the minimal structure needed for Phase 1, with room for expansion:

```yaml
# config/plexus.yaml
server:
  port: 4000
  host: "0.0.0.0"

logging:
  level: "info"  # silly, debug, info, warn, error

providers: []     # Empty for Phase 1

models: []        # Empty for Phase 1

apiKeys: []       # Empty for Phase 1
```

### 3. Type Definitions
```typescript
// packages/backend/src/types/config.ts
interface ServerConfig {
  port: number;
  host: string;
}

interface LoggingConfig {
  level: "silly" | "debug" | "info" | "warn" | "error";
}

interface PlexusConfig {
  server: ServerConfig;
  logging: LoggingConfig;
  providers: ProviderConfig[];  // Defined in later phase
  models: ModelAliasConfig[];   // Defined in later phase
  apiKeys: ApiKeyConfig[];      // Defined in later phase
}
```

### 4. API Endpoints

#### GET /health
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0"
}
```

#### GET /ready
Returns readiness status (for orchestration systems).

**Response:**
```json
{
  "ready": true
}
```

---

## Implementation Tasks

### Infrastructure Setup
- [ ] Initialize root `package.json` with workspaces configuration
- [ ] Create `packages/backend/package.json` with dependencies:
  - `yaml` - YAML parsing
  - `zod` - Schema validation
- [ ] Configure TypeScript with strict mode enabled
- [ ] Create `bunfig.toml` with test runner configuration
- [ ] Set up path aliases for clean imports (e.g., `src/utils/logger`)

### Configuration System
- [ ] Create YAML configuration loader in `config.ts`
- [ ] Implement Zod schema validation for configuration
- [ ] Add meaningful error messages for configuration validation failures
- [ ] Support environment variable overrides for critical settings:
  - `PLEXUS_PORT` → `server.port`
  - `PLEXUS_LOG_LEVEL` → `logging.level`
- [ ] Implement hot-reload file watcher for configuration changes

### HTTP Server
- [ ] Create Bun HTTP server in `server.ts`
- [ ] Implement request routing mechanism
- [ ] Add request ID generation for correlation
- [ ] Implement graceful shutdown handling

### Logging Utility
- [ ] Create structured logger with configurable levels
- [ ] Support JSON output format for production
- [ ] Include request ID in log context
- [ ] Implement child logger pattern for component-specific logging

### Health Endpoints
- [ ] Implement `/health` endpoint with version info
- [ ] Implement `/ready` endpoint for k8s-style readiness probes
- [ ] Return appropriate HTTP status codes (200 for healthy, 503 for unhealthy)

### Testing Infrastructure
- [ ] Create `setup.ts` with global test configuration
- [ ] Mock logger in setup to prevent console noise during tests
- [ ] Write tests for configuration loading and validation
- [ ] Write tests for health endpoints
- [ ] Verify test isolation (no state leakage between tests)

---

## Test Scenarios

### Configuration Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Valid YAML loads | Load well-formed plexus.yaml | Config object returned |
| Missing file | Config file doesn't exist | Clear error with path |
| Invalid YAML syntax | Malformed YAML | Parse error with line number |
| Schema violation | Missing required field | Zod validation error |
| Env override | PLEXUS_PORT=5000 | port is 5000 |

### Health Endpoint Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| GET /health | Request health status | 200 with status: ok |
| GET /ready | Request readiness | 200 with ready: true |
| Unknown route | GET /unknown | 404 response |

---

## Verification Steps

After implementation, verify the phase is complete:

```bash
# 1. Install dependencies
bun install

# 2. Run tests
bun test

# 3. Start the server
bun run dev

# 4. Test health endpoint
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"...","version":"0.1.0"}

# 5. Test ready endpoint
curl http://localhost:4000/ready
# Expected: {"ready":true}

# 6. Test invalid route
curl http://localhost:4000/invalid
# Expected: 404 response
```

---

## Notes & Decisions

### Why YAML over JSON for configuration?
- Human-readable with comments support
- Easier to maintain complex nested structures
- Standard for infrastructure configuration (k8s, docker-compose)
- Referenced in DESIGN.md Section 11 as the target format

### Why Zod for validation?
- TypeScript-first with excellent type inference
- Runtime validation with clear error messages
- Composable schemas for complex configurations
- Referenced in DESIGN.md Section 11.3

### Logging Strategy
- Use structured JSON logging for machine parsing
- Include correlation IDs for request tracing
- Configurable verbosity per environment

---

## Dependencies on Other Phases
- **None** - This is the foundation phase

## Phases That Depend on This
- **Phase 2**: OpenAI Passthrough Proxy
- **Phase 3**: Configuration & Model Aliasing  
- All subsequent phases depend on this foundation
