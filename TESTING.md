# Testing Guide

This project uses [Polly.js](https://netflix.github.io/pollyjs/) for robust E2E testing. It records and replays HTTP interactions with upstream LLM providers, ensuring tests are fast, reliable, and run without API keys.

## E2E VCR Tests

The E2E tests are located in `packages/backend/src/services/__tests__/e2e_vcr.test.ts`.

### How it works:
1.  **Dynamic Discovery**: The suite loads all `.json` files from `packages/backend/src/services/__tests__/cases/`.
2.  **Cassette Recording (Polly.js)**: 
    -   Requests to upstream providers are intercepted.
    -   In **Record Mode**, real API calls are made and saved to `__cassettes__/` as JSON files.
    -   In **Replay Mode**, the network is completely mocked using these saved JSON files.
3.  **Validation**: The test verifies that the `Dispatcher` logic correctly transforms the upstream data into a valid Unified response.

## Running Tests

### 1. Standard Run (Replay Mode)
Uses existing cassettes. No API keys or network access are required.

```bash
cd packages/backend
bun test src/services/__tests__/e2e_vcr.test.ts
```

### 2. Record Mode (Live API)
To capture new network interactions:

```bash
# From project root
PLEXUS_TEST_API_KEY="your-key" \
PLEXUS_TEST_BASE_URL="https://api.provider.com/v1" \
PLEXUS_TEST_MODEL="model-name" \
bun run update-cassettes
```

*Note: The suite automatically scrubs the `Authorization` header before saving it to disk.*

## Configuration Overrides
The following environment variables are used during **Record Mode**:

| Variable | Description | Default | 
| :--- | :--- | :--- |
| `RECORD` | Set to `1` to enable live recording. | `0` (Replay) |
| `PLEXUS_TEST_API_KEY` | API Key for the upstream provider. | `syn_test_key` |
| `PLEXUS_TEST_BASE_URL` | Base URL for the upstream provider. | `https://api.synthetic.new/openai/v1` |
| `PLEXUS_TEST_MODEL` | Target model name on the provider. | `hf:MiniMaxAI/MiniMax-M2.1` |

## Adding New Test Cases

1.  Add a new JSON request body to `packages/backend/src/services/__tests__/cases/`.
2.  Run the **Record Mode** command above to capture the network interaction.
3.  Commit the new case and its corresponding cassette in `__cassettes__/`.

```