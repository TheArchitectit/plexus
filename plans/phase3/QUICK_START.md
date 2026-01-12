# Phase 3 Quick Start Guide

## What is Model Aliasing?

Model aliasing allows you to create virtual model names that map to one or more backend provider/model combinations. This enables:

- **Transparent Provider Switching**: Change providers without updating client code
- **Load Balancing**: Distribute requests across multiple providers
- **A/B Testing**: Route a percentage of traffic to different models
- **Failover**: Automatically use backup providers
- **Cost Optimization**: Route to cheaper providers based on strategy

## Basic Example

### 1. Configure an Alias

Edit `config/plexus.yaml`:

```yaml
providers:
  - name: "openai"
    enabled: true
    apiTypes: ["chat"]
    baseUrls:
      chat: "https://api.openai.com/v1/chat/completions"
    auth:
      type: "bearer"
      apiKeyEnv: "OPENAI_API_KEY"
    models:
      - "gpt-4o-mini"

models:
  - alias: "fast"
    description: "Fast, cost-effective model"
    targets:
      - provider: "openai"
        model: "gpt-4o-mini"
    selector: "random"
```

### 2. Use the Alias

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer apikey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fast",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

That's it! The request is automatically routed to OpenAI's `gpt-4o-mini` model.

## Advanced Features

### Additional Aliases (Synonyms)

Create multiple names for the same alias:

```yaml
models:
  - alias: "fast"
    additionalAliases:
      - "quick"
      - "cheap"
    targets:
      - provider: "openai"
        model: "gpt-4o-mini"
    selector: "random"
```

Now `"fast"`, `"quick"`, and `"cheap"` all route to the same model.

### Load Balancing with Weights

Distribute traffic across multiple providers:

```yaml
models:
  - alias: "smart"
    targets:
      - provider: "openai"
        model: "gpt-4o"
        weight: 70  # 70% of requests
      - provider: "azure-openai"
        model: "gpt-4o"
        weight: 30  # 30% of requests
    selector: "random"
```

### Failover Pattern

Try providers in order:

```yaml
models:
  - alias: "reliable"
    targets:
      - provider: "primary"
        model: "gpt-4-turbo"
      - provider: "backup"
        model: "gpt-4o"
    selector: "in_order"
```

The first target is always tried first. Future phases will add automatic failover on errors.

### Direct Provider Access

You can still use direct provider/model format:

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer apikey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Selection Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `random` | Random selection (weighted or uniform) | Load balancing, A/B testing |
| `in_order` | Try targets sequentially | Failover, cost optimization |
| `cost` | Select lowest cost (Phase 7) | Cost optimization |
| `latency` | Select fastest (Phase 7) | Performance optimization |
| `performance` | Best overall (Phase 7) | Balanced optimization |

## List Available Models

```bash
curl http://localhost:4000/v1/models \
  -H "Authorization: Bearer apikey"
```

Returns all configured aliases in OpenAI-compatible format.

## Configuration Validation

Plexus validates your configuration on startup:

- ✅ No duplicate alias names
- ✅ All target providers exist
- ✅ All target models exist in providers
- ⚠️ Warns about disabled providers

## Common Patterns

### Pattern 1: Simple Alias
Map a friendly name to a specific model:
```yaml
- alias: "fast"
  targets:
    - provider: "openai"
      model: "gpt-4o-mini"
  selector: "random"
```

### Pattern 2: Multi-Provider Redundancy
Route to multiple providers for reliability:
```yaml
- alias: "production"
  targets:
    - provider: "openai"
      model: "gpt-4o"
      weight: 50
    - provider: "azure-openai"
      model: "gpt-4o"
      weight: 50
  selector: "random"
```

### Pattern 3: Cost Tiers
Create aliases for different cost/quality levels:
```yaml
- alias: "economy"
  targets:
    - provider: "openai"
      model: "gpt-4o-mini"
  selector: "random"

- alias: "standard"
  targets:
    - provider: "openai"
      model: "gpt-4-turbo"
  selector: "random"

- alias: "premium"
  targets:
    - provider: "openai"
      model: "gpt-4o"
  selector: "random"
```

### Pattern 4: Gradual Rollout
Test new providers with small traffic percentage:
```yaml
- alias: "production"
  targets:
    - provider: "existing-provider"
      model: "model-v1"
      weight: 95
    - provider: "new-provider"
      model: "model-v2"
      weight: 5  # Only 5% of traffic
  selector: "random"
```

## Troubleshooting

### "Model not found" Error
- Check that the alias exists in `models` section
- Verify alias name matches exactly (case-sensitive)
- Ensure at least one target provider is enabled

### "No enabled targets" Error
- Check that target providers have `enabled: true`
- Verify provider names in targets match provider configurations
- Check that models exist in provider's `models` array

### Unexpected Provider Selection
- Check weights in your configuration
- Remember: weights are relative (70/30 = 70% vs 30%)
- Use logs to see which provider was selected: `logging.level: "debug"`

## Next Steps

- See `VERIFICATION.md` for detailed testing procedures
- See `IMPLEMENTATION_SUMMARY.md` for architecture details
- See `config/plexus.example-phase3.yaml` for comprehensive examples
- Explore Phase 4 for cross-provider API transformation
