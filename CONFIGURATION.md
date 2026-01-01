# Configuration

Plexus is configured via a `config/plexus.yaml` file. This file defines your providers, model routing logic, and global settings.

## Configuration File (`plexus.yaml`)

The configuration file is YAML-based and sits at the heart of how Plexus routes and transforms requests.

### Example Configuration

```yaml
providers:
  # Define your upstream providers
  openai_direct:
    type: OpenAI
    api_base_url: https://api.openai.com/v1
    api_key: your_openai_key
    models:
      - gpt-4o
      - gpt-4o-mini

  my_anthropic:
    type: Anthropic
    api_base_url: https://api.anthropic.com/v1
    api_key: your_anthropic_key
    models:
      - claude-3-5-sonnet-latest

models:
  # Define aliases and where they route
  fast-model:
    targets:
      - provider: openai_direct
        model: gpt-4o-mini
  
  smart-model:
    targets:
      - provider: my_anthropic
        model: claude-3-5-sonnet-latest
        
  balanced-model:
    selector: random
    targets:
      - provider: openai_direct
        model: gpt-4o
      - provider: my_anthropic
        model: claude-3-5-sonnet-latest
```

### Configuration Sections

#### `providers`
This section defines the upstream AI services you want to connect to.

- **`type`**: The transformer type to use. Supported types include:
    - `OpenAI`
    - `Anthropic`
    - `Gemini`
- **`api_base_url`**: The root URL for the provider's API.
- **`api_key`**: Your authentication token.
- **`models`**: A list of raw model names available from this specific provider.
- **`headers`**: (Optional) Extra headers to send with every request to this provider (useful for custom gateways or organization IDs).

#### `models`
This section defines the "virtual" models or aliases that clients will use when making requests to Plexus.

- **Model Alias**: The key (e.g., `fast-model`, `gpt-4-turbo`) is the name clients send in the `model` field of their API request.
- **`selector`**: (Optional) The strategy to use for target selection when multiple targets are defined.
    - `random`: (Default) Randomly selects a target.
- **`targets`**: A list of provider/model pairs that back this alias.
    - `provider`: Must match a key defined in the `providers` section.
    - `model`: The specific model name to use on that provider.

## Environment Variables

When running Plexus, you can use the following environment variables to control its behavior:

- **`CONFIG_FILE`**: Path to the `plexus.yaml` configuration file.
    - Default: `config/plexus.yaml` (relative to project root).
- **`DATA_DIR`**: Directory where Plexus stores its SQLite database (`usage.sqlite`) for logs and cooldowns.
    - Default: Falls back to the directory containing your configuration file, or a `data/` directory in the current working directory.
- **`LOG_LEVEL`**: The verbosity of the server logs.
    - Supported values: `error`, `warn`, `info`, `debug`.
    - Default: `info`.

### Example Usage

```bash
CONFIG_FILE=./my-config.yaml DATA_DIR=./data LOG_LEVEL=debug ./plexus
```
