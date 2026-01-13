# Phase 1: Foundation & Layout (Week 1)

## Overview
This phase establishes the foundation for the Plexus UI, including project setup, dependencies, core contexts, API client, layout components, and routing configuration.

---

## 1.1 Project Setup & Dependencies
**Objective**: Ensure all required dependencies are installed and configured.

**Tasks**:
- Verify package.json has all required dependencies:
  - `lucide-react` - Icons
  - `openapi-fetch` - API client with type safety
  - `react-router-dom` - Routing
  - `monaco-editor` - YAML editor (for Config page)
  - `clsx`, `tailwind-merge`, `class-variance-authority` - Utility functions
  - Radix UI primitives for shadcn components
- Install missing dependencies if needed, using bun install, not manual package.json editing.

**Deliverables**: All dependencies installed and verified working.

---

## 1.2 Additional shadcn/ui Components
**Objective**: Add missing shadcn/ui components needed beyond existing Button and Card.

**Tasks**:
- Add shadcn/ui components using CLI:
  - `Input` - Form inputs for various pages
  - `Switch` - Toggle switches for enabling/disabling providers
  - `Badge` - Status indicators
  - `Tooltip` - Collapsed sidebar tooltips
  - `Dialog` - Modal dialogs (replace custom Modal from references)
  - `Accordion` - Expandable sections in provider model management
  - `Tabs` - Tab navigation in debug/errors pages
  - `Table` - Data tables for logs, providers, models, keys
  - `Label` - Form labels
  - `Textarea` - Multi-line text inputs
- Configure all components to use existing CSS variables from `app.css`
- Ensure dark mode support (classes already present in app.css)

**Deliverables**: All required shadcn/ui components added to `src/components/ui/`.

---

## 1.3 Core Context Providers
**Objective**: Set up authentication and sidebar state management.

**Tasks**:
- Create `src/contexts/AuthContext.tsx`:
  - Manage admin key in localStorage (`plexus_admin_key`)
  - Provide `login()` and `logout()` functions
  - Handle 401 errors and redirect to login
  - Pattern from `references/contexts/AuthContext.tsx`
- Create `src/contexts/SidebarContext.tsx`:
  - Manage collapsed state (64px collapsed, 200px expanded)
  - Persist to localStorage
  - Provide `toggleSidebar()` function
  - Pattern from `references/contexts/SidebarContext.tsx`
- Create `ProtectedRoute` component to guard authenticated routes

**Deliverables**: Context providers created and ready for use.

---

## 1.4 API Client Setup
**Objective**: Set up type-safe API client using openapi-fetch.

**Tasks**:
- Create `src/lib/api-client.ts`:
  - Initialize `createClient<paths>()` from openapi-fetch
  - Base URL configured (empty string, proxied via server)
  - Add auth header interceptor using localStorage admin key
  - Handle 401 errors by clearing auth and redirecting
  - Export client instance
- Create `src/lib/api.ts` with helper functions (adapted from `references/lib/api.ts`):
  - Map API operations to typed client calls
  - Helper functions for common queries:
    - `getConfig()` - GET /config
    - `updateConfig()` - POST /config
    - `getState()` - GET /state
    - `updateState()` - POST /state (for debug mode, clear cooldowns, etc.)
    - `queryLogs()` - GET /logs with filters
    - `deleteLogs()` - DELETE /logs
    - `getLogDetails()` - GET /logs/{id}
    - `getEvents()` - GET /events (SSE stream)
  - YAML parsing/stringifying for config editing
  - Use generated types from `lib/management.d.ts`

**Deliverables**: Type-safe API client and helper functions ready.

---

## 1.5 Layout Components
**Objective**: Build main layout with collapsible sidebar.

**Tasks**:
- Create `src/components/layout/Sidebar.tsx`:
  - 200px expanded, 64px collapsed width
  - Logo with Plexus branding
  - Navigation sections: Main, Configuration, System
  - Nav items with active state highlighting
  - Collapse/expand button with icon
  - Debug mode toggle with confirmation dialog
  - Logout button
  - Tooltip support when collapsed
  - Icons from Lucide React: LayoutDashboard, Activity, FileText, Server, Box, Key, Shield, Settings, Bug, Database, AlertTriangle, LogOut, PanelLeftClose, PanelLeftOpen
  - Pattern from `references/components/layout/Sidebar.tsx` but using shadcn Dialog
- Create `src/components/layout/MainLayout.tsx`:
  - Fixed sidebar on left
  - Main content area with dynamic margin based on sidebar state
  - Smooth transitions (duration-300)
  - Pattern from `references/components/layout/MainLayout.tsx`

**Deliverables**: Layout components ready for routing.

---

## 1.6 Routing Setup
**Objective**: Configure React Router with all routes and protected routes.

**Tasks**:
- Update `src/App.tsx`:
  - Wrap with AuthProvider
  - Wrap with SidebarProvider
  - Configure BrowserRouter with routes:
    - `/login` - Login page (public)
    - `/` - Dashboard (protected)
    - `/usage` - Usage analytics (protected)
    - `/logs` - Request logs (protected)
    - `/providers` - Provider management (protected)
    - `/models` - Model aliases (protected)
    - `/keys` - API key management (protected)
    - `/config` - YAML configuration (protected)
    - `/debug` - Debug traces (protected)
    - `/errors` - Error logs (protected)
  - Create NotFound page for invalid routes
- Update `src/main.tsx` to render App

**Deliverables**: Routing configured with protected routes.

---

## Summary

**Duration**: 1 week

**Key Deliverables**:
- All dependencies installed and verified
- shadcn/ui components added (Input, Switch, Badge, Tooltip, Dialog, Accordion, Tabs, Table, Label, Textarea)
- AuthContext and SidebarContext created
- Type-safe API client with helper functions
- Layout components (Sidebar, MainLayout)
- React Router configuration with protected routes

**Next Steps**: Begin Phase 2 - Core Pages (Login, Dashboard, Usage)
