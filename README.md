# Plexus

LLM Virtualization and Routing Layer powered by Bun and `@musistudio/llms`.

## Commands

### Setup
```bash
bun install
```

### Development
Runs frontend (5173) and backend (3000) concurrently:
```bash
bun run dev
```

### Production Build
```bash
bun run build
```

### Production Start
```bash
bun start
```

## Environment Variables
- `PLEXUS_CONFIG_DIR`: Path to configuration directory (default: `./config`)
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` (default: `info`)

See [AGENTS.md](./AGENTS.md) for detailed architecture and development conventions.
