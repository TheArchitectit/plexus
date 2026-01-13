# Plexus Frontend

Frontend for Plexus built with React 19, TypeScript, Tailwind CSS, and Bun.

## Setup

This frontend uses Bun's native bundler with zero configuration:

- **Bun plugin**: `bun-plugin-tailwind` handles Tailwind CSS
- **Entry point**: `src/index.html` (Bun serves this as an SPA)
- **Dev server**: Run `bun src/index.html` from this directory
- **Type checking**: `bun tsc --noEmit`

## Development

Start dev server:
```bash
bun src/index.html
```

Type check:
```bash
bun run typecheck
```

Build for production:
```bash
bun run build
```

## Project Structure

```
src/
├── index.html    # Entry point (SPA)
├── app.tsx       # React app initialization
├── App.tsx       # Main app component
└── app.css       # Tailwind CSS via @import
```

## Tailwind CSS

Tailwind is integrated via Bun's plugin system:
- Plugin configured in `bunfig.toml`
- Imported in `src/app.css` via `@import "tailwindcss";`
- No build configuration needed

## shadcn/ui

shadcn/ui is configured via `components.json`:
- Style: new-york
- Base color: zinc
- CSS variables: enabled

Components can be added using the shadcn CLI from this directory.
