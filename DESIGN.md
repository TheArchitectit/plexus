# Plexus Design Document

## Executive Summary

Plexus is a high-performance, unified API gateway and virtualization layer for Large Language Models (LLMs). It provides a single entry point for various LLM API formats, enabling seamless provider switching, intelligent load balancing, and comprehensive request management without requiring changes to client applications.

---

## Core Capabilities

### 1. Multi-Protocol API Gateway

Plexus supports multiple incoming API formats, allowing clients to send requests in their preferred format while routing to any backend provider:

#### Supported API Styles
- **OpenAI Chat Completions** (`/v1/chat/completions`) - Full compatibility with OpenAI's chat completion API
- **Anthropic Messages** (`/v1/messages`) - Native support for Anthropic's messages API format
- **Google Gemini** - Support for Google's Gemini API format
- **Model Listing** (`/v1/models`) - OpenAI-compatible model enumeration endpoint

#### Protocol Translation
The system performs bidirectional translation between API formats:
1. **Incoming Request Parsing** - Converts client requests from their native format (OpenAI, Anthropic, Gemini) into a unified internal representation
2. **Provider Request Transformation** - Converts the unified format into the target provider's expected format
3. **Response Transformation** - Converts provider responses back to the unified format
4. **Client Response Formatting** - Formats responses back to the client's expected API style

#### Pass-Through Optimization
When the incoming API type matches the target provider's API type, Plexus can bypass transformation entirely, maximizing performance and preserving provider-specific features.

---

### 2. Unified Internal Data Model

The system uses a canonical internal representation that normalizes concepts across different API formats:

#### Unified Message Structure
- Support for multiple message roles: `user`, `assistant`, `system`, `tool`
- Content types: plain text, structured content blocks, images (base64 encoded)
- Tool/function calling with argument serialization
- Reasoning/thinking content with signature verification
- Cache control directives for prompt caching

#### Unified Tool Representation
- Function definitions with JSON Schema parameters
- Tool choice configuration (auto, none, required, specific function)

#### Unified Response Structure
- Response content with reasoning/thinking output
- Tool call results with structured arguments
- Token usage accounting (input, output, cached, reasoning)
- Provider metadata for cost and routing attribution

---

### 3. Intelligent Request Routing

#### Model Aliasing
Model aliases decouple client-facing model names from actual provider implementations:
- Define virtual model names that map to one or more provider/model combinations
- Support additional aliases for each canonical model name
- Enable transparent model upgrades and A/B testing

#### Multi-Target Load Balancing
Each model alias can have multiple targets with configurable selection strategies:

- **Random Selection** - Uniform distribution across available targets
- **Round-Robin (In-Order)** - Sequential rotation through targets
- **Cost-Based Selection** - Prefer lower-cost providers based on pricing configuration
- **Latency-Based Selection** - Prefer faster providers based on historical performance
- **Performance-Based Selection** - Composite scoring considering throughput and latency

#### API Type Matching Priority
Optional `api_match` priority mode filters targets to those supporting the incoming API type before applying the selection strategy, avoiding unnecessary protocol transformation.

#### Provider Health Filtering
Before selection, unhealthy providers (those on cooldown) are automatically filtered out.

---

### 4. Provider Management

#### Provider Configuration
Each provider is configured with:
- **API Types** - Supported API formats (chat, messages, gemini)
- **Base URLs** - Per-API-type endpoint configuration
- **Authentication** - API keys or OAuth credentials
- **Custom Headers** - Additional HTTP headers for provider-specific needs
- **Extra Body Fields** - Additional request body parameters
- **Discount Rates** - Cost adjustment factors for billing calculations
- **Enable/Disable Toggle** - Runtime provider availability control
- **Force Transformer Override** - Explicit transformer selection

#### Multi-Provider Authentication

**Static API Keys:**
- Bearer token authentication for OpenAI-compatible APIs
- x-api-key header for Anthropic APIs
- x-goog-api-key for Google APIs

---

### 5. Resilience & Health Management

#### Cooldown System
Providers experiencing errors are automatically placed on cooldown:
- **Trigger Conditions** - 429 (rate limit), 401/403 (auth errors), 408 (timeout), 5xx (server errors)
- **Duration Parsing** - Intelligent extraction of retry-after hints from provider error messages
- **Persistent Storage** - Cooldown state survives service restarts
- **Manual Override** - Administrative clearing of cooldowns


---

### 6. Streaming Support

Full Server-Sent Events (SSE) support for real-time token streaming:

#### Stream Processing Pipeline
1. **Raw Stream Tap** - Capture original provider stream for debugging
2. **Provider Stream Transformation** - Parse provider-specific SSE into unified chunks
3. **Client Stream Formatting** - Re-encode unified chunks to client's expected SSE format
4. **Transformed Stream Tap** - Capture final client stream for debugging

#### Streaming Features
- Time-to-First-Token (TTFT) measurement
- Tokens-per-second throughput calculation
- Usage extraction from stream completion events
- Proper stream termination with end-of-stream markers

#### Pass-Through Streaming
When API formats match, raw provider streams flow directly to clients without parsing/re-encoding overhead.

---

### 7. Cost Management & Pricing

#### Pricing Configuration Models

**Simple Pricing:**
- Fixed per-million-token rates for input, output, and cached tokens

**Range-Based Pricing:**
- Tiered pricing based on input token count thresholds
- Supports volume discount modeling

**OpenRouter Integration:**
- Dynamic pricing lookup using OpenRouter model slugs
- Automatic price updates from OpenRouter's pricing API

#### Cost Calculation
- Real-time cost calculation for each request
- Separate tracking for input, output, and cached token costs
- Provider discount factor application
- Cost source metadata for attribution

---

### 8. Usage Analytics & Observability

#### Request Logging
Comprehensive per-request metrics:
- Request identifiers and timestamps
- Source IP and API key attribution
- Model alias vs. actual model mapping
- API type transformation tracking
- Token usage breakdown (input, output, reasoning, cached)
- Cost breakdown and totals
- Duration and streaming status
- Pass-through optimization status

#### Performance Metrics
- Time-to-First-Token measurements
- Tokens-per-second throughput
- Request duration tracking

#### Debug Mode
Optional comprehensive request/response capture:
- Raw incoming request bodies
- Transformed provider request payloads
- Raw provider responses
- Transformed client responses
- Streaming snapshots for async debugging

#### Error Tracking
Dedicated error log storage with:
- Error messages and stack traces
- Request context and details
- Timestamps and correlation IDs

---

### 9. Administrative Dashboard

#### System Overview
- Real-time health status with degradation indicators
- Active cooldown monitoring and manual clearing
- Request volume and token consumption metrics
- Cost tracking dashboards

#### Time-Based Analytics
- Hourly, daily, weekly, and monthly usage charts
- Token breakdown by type (input, output, cached, reasoning)
- Cost accumulation tracking

#### Configuration Management
Visual configuration editing for:
- Provider CRUD operations with immediate effect
- Model alias management with target configuration
- API key management with attribution
- Pricing configuration editing
- Enable/disable toggles

#### Request Log Viewer
- Paginated log browsing with filtering
- Request detail inspection
- Debug trace viewing
- Error log examination

#### OAuth Management
- Multi-provider OAuth status display
- Account health and cooldown status
- Token expiration monitoring
- Manual refresh triggers
- Account addition/removal

---

### 10. Advanced Features

#### Extended Thinking Support
Full support for Claude's extended thinking feature:
- Thinking budget configuration translation between API formats
- Thinking content streaming with signature preservation
- Token imputation for thinking vs. output tokens when providers don't report separately

#### Tool/Function Calling
Normalized tool calling across providers:
- Tool definition translation between OpenAI and Anthropic formats
- Tool result handling and formatting
- Streaming tool call delta accumulation

#### Cache Control
Support for provider caching features:
- Cache control directive preservation
- Cached token tracking and pricing
- Cache creation token accounting

#### Server-Side Tools
Support for provider-hosted tools:
- Web search result formatting
- Annotation/citation handling

#### Image Support
Multi-modal request handling:
- Base64 image encoding/decoding
- Media type preservation
- Image URL reference handling

---

### 11. Configuration System

#### YAML-Based Configuration
Human-readable configuration files with:
- Provider definitions with nested model configurations
- Model alias definitions with target lists
- API key definitions with attribution
- Administrative credentials

#### Hot Reload
- File watcher for configuration changes
- Automatic revalidation on change
- Zero-downtime configuration updates

#### Schema Validation
- Comprehensive Zod schema validation
- Meaningful error messages for configuration issues
- Type safety throughout the configuration system

---
### 12. Security

#### API Key Authentication
- Named API keys with configurable secrets
- Attribution tracking per key
- Key-based usage segregation

#### Administrative Authentication
- Separate admin key for management endpoints
- Session-based UI authentication
- Automatic session invalidation on auth failure

#### OAuth Security
- PKCE flow for OAuth authorization
- Secure token storage with encryption
- Automatic credential rotation

---

## Architectural Principles

### Separation of Concerns
- **Transformers** handle format conversion without business logic
- **Router** handles target selection without protocol knowledge
- **Dispatcher** orchestrates the request lifecycle
- **Response Handler** manages response formatting and metrics collection

### Extensibility
- Transformer pattern allows adding new API formats
- Selector pattern allows adding new routing strategies
- Inspector pattern allows adding new stream processing stages

### Performance Optimization
- Pass-through mode for matching API formats
- Streaming pipeline with minimal buffering
- Connection pooling and keep-alive support
- Efficient binary data handling

### Reliability
- Automatic failover on provider errors
- Persistent state for cooldowns
- Graceful degradation with health indicators
- Comprehensive error logging

---

