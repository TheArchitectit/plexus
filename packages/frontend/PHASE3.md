# Phase 3: Configuration Management - Providers, Models, Keys (Week 3)

## Overview
This phase implements the configuration management pages for Providers, Models (aliases), and API Keys, providing full CRUD interfaces for all system configuration entities.

---

## 3.1 Providers Page
**Objective**: Create provider configuration management interface.

**Tasks**:
- Create `src/pages/Providers.tsx`:
  - Provider list table with columns:
    - Provider Name/ID
    - Status (Badge: enabled/disabled/healthy)
    - APIs supported
    - Actions (edit, delete)
  - Add/Edit Provider modal (Dialog):
    - Basic Info section: ID, Name, Enabled (Switch)
    - API Support section: Checkboxes for OpenAI/Anthropic/Gemini with Base URL inputs
    - API Key input with visibility toggle
    - Advanced section (Accordion): discount, headers, extraBody
    - Models section (Accordion): List models with pricing config
    - Save/Cancel buttons
  - Use shadcn Table, Dialog, Input, Switch, Accordion, Button, Badge, Label components
  - Use Lucide icons: Plus, Trash2, Edit2, ChevronDown, ChevronUp
  - Fetch config from: `/config`, update via: `/config` (POST)
  - Parse/edit YAML config

**Deliverables**: Full provider CRUD interface.

---

## 3.2 Models Page
**Objective**: Create model alias and routing configuration interface.

**Tasks**:
- Create `src/pages/Models.tsx`:
  - Search input for filtering aliases
  - Aliases list table with columns:
    - Alias Name
    - Additional Aliases (comma-separated)
    - Selector Strategy (dropdown)
    - Targets (provider/model pairs)
    - Actions (edit, delete)
  - Add/Edit Alias modal (Dialog):
    - Basic Info section: Alias Name, Selector Strategy
    - Additional Aliases section: List with add/remove buttons
    - Targets section: Dynamic list of provider/model dropdowns with add/remove buttons
    - Save/Cancel buttons
  - Use shadcn Table, Dialog, Input, Button, Label components
  - Use Lucide icons: Plus, Trash2, Search, X
  - Fetch config from: `/config`, update via: `/config` (POST)
  - Parse/edit YAML config

**Deliverables**: Full model alias CRUD interface.

---

## 3.3 Keys Page
**Objective**: Create API key management interface.

**Tasks**:
- Create `src/pages/Keys.tsx`:
  - Search input for filtering keys
  - Keys table with columns:
    - Key Name
    - Secret (truncated with copy button)
    - Comment
    - Actions (edit, delete)
  - Add/Edit Key modal (Dialog):
    - Key Name input
    - Secret input with generate button (generate UUID)
    - Comment input (optional)
    - Save/Cancel buttons
  - Use shadcn Table, Dialog, Input, Button, Label components
  - Use Lucide icons: Plus, Trash2, Search, Copy, X
  - Fetch config from: `/config`, update via: `/config` (POST)
  - Copy-to-clipboard for secrets

**Deliverables**: Full API key CRUD interface.

---

## Summary

**Duration**: 1 week

**Key Deliverables**:
- Providers page with table view and full add/edit modal
- Provider configuration including API support, credentials, advanced options, and model pricing
- Models page with search and model alias management
- Alias configuration with multiple additional aliases and target routing
- Keys page with search and API key management
- Secret generation and copy-to-clipboard functionality
- All pages parse and update YAML configuration via `/config` endpoint

**Next Steps**: Begin Phase 4 - Logs & Real-time Monitoring (Logs, Debug, Errors)
