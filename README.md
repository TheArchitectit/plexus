# Plexus

**A Universal LLM API Gateway & Transformation Layer.**

![Dashboard Overview](docs/images/splash.png)

### [🚀 API Reference](docs/API.md) | [⚙️ Configuration Guide](CONFIGURATION.md)

Plexus unifies interactions with multiple AI providers—OpenAI, Anthropic, Gemini, and more—under a single, standard API. It handles protocol translation, load balancing, and observability, allowing you to switch models and providers without rewriting your client code.

![Dashboard Overview](docs/images/homepage.png)

## Core Features

- **Unified API**: Support for both OpenAI-compatible, Anthropic-compatible and Gemini endpoints.
  - Tools like Gemini and ClaudeCode work flawlessly.
- **Protocol Transformation**: Transparently convert requests and responses between different provider formats (e.g., send an OpenAI request to Anthropic Claude).
- **Streaming Support**: Full streaming support with real-time transformation of event streams.
- **Model Aliasing**: Define friendly model names that route to specific provider/model combinations.
- **Load Balancing**: Distribute requests across multiple backends for the same model alias, with configurable selection & routing options.
  - Automatic Cooldown for providers experiencing issues.
- **Reasoning Support**: Unified handling of reasoning/thinking content from modern models, including Gemini `thoughtSignatures`.
- **Pass-through Optimization**: Automatically detects when the incoming request format matches the target provider's native format, bypassing expensive transformations to minimize latency and overhead while maintaining full observability. Active passthrough requests are highlighted with a ⚡ icon in the dashboard logs.
- **Deep Debugging**: Easy-to-use raw request and response capture, with detailed information of raw and transformed responses, as well as stream reconstruction.

## The Plexus Dashboard

Plexus comes with a comprehensive, real-time dashboard for managing your AI gateway.

### Observability & Debugging
Gain deep insights into your LLM traffic. View request logs, analyze detailed traces, and debug raw payloads.

| Request Logs | Deep Tracing |
|:---:|:---:|
| ![Request Logs](docs/images/request_logs.png) | ![Debug Traces](docs/images/debug_traces.png) |

Use **Debug Mode** to inspect the raw input and output of every transformation step.

![Debug Mode](docs/images/debug_mode.png)

### Configuration Management
Manage your providers and model aliases directly from the UI or via the YAML configuration editor.

| Provider Management | Model Aliases |
|:---:|:---:|
| ![Providers](docs/images/providers.png) | ![Model Aliases](docs/images/model_aliases.png) |

**YAML Config Editor** for power users:
![Config Editor](docs/images/config_editor.png)

### Usage Analytics
Track your API usage and trends over time.

![Usage Overview](docs/images/usage_overview.png)

## Documentation

- **[Configuration Guide](CONFIGURATION.md)**: Learn how to set up `plexus.yaml` to define providers, models, and routing rules.
- **[API Documentation](docs/API.md)**: Detailed reference for the Standard Inference APIs and Management APIs.

## Installation

Plexus is built with [Bun](https://bun.sh/).

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mcowger/plexus.git
   cd plexus
   ```

2. **Install dependencies**:
   ```bash
   bun run install:all
   ```

### Docker

You can also run Plexus using Docker. This is the recommended way for production deployments.

**Build the image:**
```bash
docker build -t plexus .
```

**Run the container:**
```bash
docker run -p 4000:4000 \
  -v $(pwd)/config/plexus.example.yaml:/app/config/plexus.yaml \
  -v plexus-data:/app/data \
  -e LOG_LEVEL=info \
  plexus
```

-   Mount your configuration file to `/app/config/plexus.yaml`.
-   Mount a volume to `/app/data` to persist usage logs and other data.
-   Set `LOG_LEVEL` to control verbosity.

## Development

Plexus includes a unified development environment that manages both the backend API and the frontend dashboard.

### Starting the Dev Stack

To start the full stack in development mode:
```bash
bun run dev
```

This single command orchestrates the following:
1.  **Backend (Port 4000):** Starts the API server in **watch mode**.
    -   Serves the API endpoints (`/v1/*`, `/health`).
    -   Serves the compiled Frontend assets.
2.  **Frontend Builder:** Starts the React builder in **watch mode**.
    -   Automatically rebuilds the UI on changes.

### Accessing the Dashboard
Open your browser to: `http://localhost:4000`

## Compiling to Standalone Executables

Plexus can be compiled into a single, self-contained binary that includes the Bun runtime, all backend logic, and the pre-built frontend dashboard.

### Build Commands

- **macOS (ARM64/Apple Silicon):** `bun run compile:macos`
- **Linux (x64):** `bun run compile:linux`
- **Windows (x64):** `bun run compile:windows`

The resulting executable will be named `plexus-macos` (or `plexus-linux` / `plexus.exe`) in the project root.

### VS Code Integration

Pre-configured tasks and launch settings are available in the `.vscode` directory:

-   **Run Dev Stack:** Press `Cmd+Shift+B` (or `Ctrl+Shift+B`) and select `Bun: Dev Stack`.
-   **Debugging:** Select `Debug Backend` from the Run & Debug sidebar.
-   **Note:** Requires the [Bun for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=Oven.bun-vscode) extension.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.