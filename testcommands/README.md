# Test Commands

This directory contains utilities for testing the Plexus LLM server.

## Files

- `test_request.ts`: A Bun script to send requests to the local server.
- `input.json`: A template request body with a model placeholder.

## Usage

Ensure the Plexus server is running (defaulting to `http://localhost:3000`).

### Specifying Models

Plexus supports three ways to route requests to models:

1.  **Plexus Aliases (Recommended)**: Use a friendly name defined in `config/plexus.yaml`. This supports load balancing and transparent provider switching.
    - Example: `gpt-4`, `coding-assistant`, `fast-model`
2.  **Auto-resolution**: Specify just the model name. Plexus will automatically find and select a provider that supports that model.
    - Example: `claude-3-5-sonnet-20240620`, `gpt-4o-mini`
3.  **Explicit Provider Routing**: Directly specify the provider and model using a comma-separated format.
    - Example: `openai,gpt-4o-mini`, `anthropic,claude-3-5-sonnet-20240620`

### Running a Test Request

Use `bun` to execute the script. You must provide the target model name and the path to a JSON input file.

```bash
bun test_request.ts <model> <json_file>
```

**Example:**

```bash
# From within the testcommands directory
bun test_request.ts gpt-4o-mini input.json

# From the project root
bun testcommands/test_request.ts gpt-4o-mini testcommands/input.json
```

### JSON Input Format

The script looks for a `model` field in the JSON file and replaces its value with the model name provided as a command-line argument.

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "model": "PLACEHOLDER_MODEL",
  "stream": false
}
```
