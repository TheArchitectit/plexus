# Plexus Frontend Implementation Plan

## Overview
This document outlines a phased approach to implementing the Plexus UI, following the design specifications in `FEDESIGN.md`, using shadcn/ui components, Lucide React icons, and the generated API types from `lib/management.d.ts`.

**Tech Stack**
- React 19 with TypeScript
- React Router DOM for routing
- shadcn/ui components (Radix UI primitives)
- Lucide React icons
- openapi-fetch with generated types
- Tailwind CSS with existing theme from `app.css`

---

## Phase 1: Foundation & Layout (Week 1)

### 1.1 Project Setup & Dependencies
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

### 1.2 Additional shadcn/ui Components
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

### 1.3 Core Context Providers
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

### 1.4 API Client Setup
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

### 1.5 Layout Components
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

### 1.6 Routing Setup
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

## Phase 2: Core Pages - Dashboard, Usage, Login (Week 2)

### 2.1 Login Page
**Objective**: Create authentication page.

**Tasks**:
- Create `src/pages/Login.tsx`:
  - Centered card layout (max-width 600px)
  - Plexus logo and branding
  - Admin key password input (masked)
  - Login button
  - Error handling for invalid credentials
  - Use shadcn Card, Input, Button, Label components
  - Use AuthContext.login() to authenticate
  - Pattern from `references/pages/Login.tsx` but with shadcn components

**Deliverables**: Functional login page with authentication.

---

### 2.2 Dashboard Page
**Objective**: Create main dashboard with real-time stats and system overview.

**Tasks**:
- Create `src/pages/Dashboard.tsx`:
  - 5-column grid for stat cards
  - Stat cards for: Requests, Tokens, Avg Latency, Requests Today, Tokens Today, Cost Today
  - Service alerts card (shown when cooldowns exist)
  - Recent activity chart (AreaChart from Recharts)
  - Time range selector (hour/day/week/month)
  - Auto-refresh every 30 seconds
  - "Last updated" time display
  - Use shadcn Card, Badge, Button components
  - Use Lucide icons: Activity, Server, Zap, Database, AlertTriangle
  - Fetch data from: `/state` (for cooldowns, provider metrics), `/logs` (for usage stats)
  - Pattern from `references/pages/Dashboard.tsx` adapted to new API
- Create `src/components/dashboard/RecentActivityChart.tsx`:
  - Recharts AreaChart for requests + tokens over time
  - Custom tooltip styling
  - Responsive height (300px)

**Deliverables**: Dashboard with real-time stats and visualizations.

---

### 2.3 Usage Page
**Objective**: Create comprehensive usage analytics page with multiple charts.

**Tasks**:
- Create `src/pages/Usage.tsx`:
  - 4-column responsive grid layout
  - 8 chart cards:
    - Requests over Time (AreaChart)
    - Token Usage (Stacked AreaChart - input/output/reasoning/cached)
    - Model Distribution (PieChart - by requests and by tokens)
    - Provider Distribution (PieChart - by requests and by tokens)
    - API Key Distribution (PieChart - by requests and by tokens)
  - Time range selector (hour/day/week/month)
  - All charts using Recharts
  - Hover tooltips with formatted data
  - Use shadcn Card, Button components
  - Fetch data from: `/logs` with time range filtering
  - Aggregate data client-side by model/provider/key

**Deliverables**: Usage analytics page with all charts implemented.

---

## Phase 3: Configuration Management - Providers, Models, Keys (Week 3)

### 3.1 Providers Page
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

### 3.2 Models Page
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

### 3.3 Keys Page
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

## Phase 4: Logs & Real-time Monitoring (Week 4)

### 4.1 Logs Page
**Objective**: Create detailed request logs page with real-time updates.

**Tasks**:
- Create `src/pages/Logs.tsx`:
  - Search/filter card:
    - Model filter dropdown
    - Provider filter dropdown
    - API Key filter dropdown
    - Success status filter (all/success/error)
  - Logs table with horizontal scroll:
    - Columns: Date, Key, Source IP, API, Model, Tokens, Cost, Performance, Mode, Status, Debug, Error, Delete
    - Hover effects for delete buttons
    - Status badges with icons
  - Pagination controls (prev/next with page numbers)
  - Delete individual log with confirmation
  - Delete all logs modal
  - Real-time SSE updates (when on first page)
  - Debug/Error navigation buttons
  - Cost tooltip with pricing source details
  - Copy-to-clipboard for model names
  - Use shadcn Table, Dialog, Input, Button, Badge, Label components
  - Use Lucide icons: Search, Trash2, ChevronLeft, ChevronRight, Bug, AlertTriangle, Copy
  - Fetch logs from: `/logs` with filters/pagination
  - SSE stream from: `/events` for real-time updates
  - Delete via: `/logs` (DELETE)
  - Pattern from `references/pages/Logs.tsx`

**Deliverables**: Logs page with real-time updates and full CRUD.

---

### 4.2 Debug Page
**Objective**: Create request/response payload inspection interface.

**Tasks**:
- Create `src/pages/Debug.tsx`:
  - Two-pane layout:
    - Left pane: Request list with timestamps and IDs
    - Right pane: Request details with accordion panels
  - Accordion panels for each payload type:
    - Raw Request
    - Transformed Request
    - Raw Response
    - Transformed Response
    - Snapshots (when available)
  - Monaco Editor for YAML/JSON display
  - Copy-to-clipboard buttons
  - Delete log button
  - Use shadcn Dialog, Tabs, Button, Badge components
  - Use Monaco Editor for code display
  - Use Lucide icons: Copy, Trash2, ChevronDown, ChevronUp
  - Fetch debug logs from: `/logs?type=trace`
  - Get details from: `/logs/{id}`
  - Delete via: `/logs/{id}` (DELETE)
  - Pattern from `references/pages/Debug.tsx`

**Deliverables**: Debug page with payload inspection.

---

### 4.3 Errors Page
**Objective**: Create error investigation and debugging interface.

**Tasks**:
- Create `src/pages/Errors.tsx`:
  - Two-pane layout similar to Debug page:
    - Left pane: Error list with timestamps
    - Right pane: Error details
  - Error details:
    - Error message
    - Stack trace
    - Additional details (when available)
  - Monaco Editor for stack trace display
  - Delete individual error with confirmation
  - Delete all errors modal
  - Use shadcn Dialog, Button, Badge components
  - Use Monaco Editor for code display
  - Use Lucide icons: Trash2, ChevronDown, ChevronUp
  - Fetch errors from: `/logs?type=error`
  - Delete via: `/logs` (DELETE) with error type

**Deliverables**: Errors page with full investigation tools.

---

## Phase 5: Configuration & System Settings (Week 5)

### 5.1 Config Page (YAML Editor)
**Objective**: Create direct YAML configuration editing interface.

**Tasks**:
- Create `src/pages/Config.tsx`:
  - Header with title and action buttons (Save, Reset)
  - Monaco Editor container for YAML editing
  - YAML syntax highlighting
  - Validation errors display
  - Real-time editing
  - Save with confirmation
  - Use shadcn Button components
  - Use Monaco Editor for YAML editing
  - Use Lucide icons: Save, RotateCcw, Check, X
  - Fetch config from: `/config`
  - Save via: `/config` (POST)
  - Pattern from `references/pages/Config.tsx`

**Deliverables**: YAML editor page with validation.

---

### 5.2 System State Management
**Objective**: Implement system state controls and displays.

**Tasks**:
- Enhance Dashboard with system state display:
  - Show uptime, version from `/state`
  - Show debug mode status
  - Show provider health and metrics
  - Show active cooldowns
- Implement debug mode toggle:
  - Confirmation dialog using shadcn Dialog
  - Call `/state` POST with action "set-debug"
  - Update state immediately
- Implement clear cooldowns functionality:
  - Button to clear all or specific provider cooldowns
  - Call `/state` POST with action "clear-cooldowns"
  - Update state immediately
- Implement provider enable/disable:
  - Toggle provider enabled state
  - Call `/state` POST with action "enable-provider" or "disable-provider"
  - Update state immediately

**Deliverables**: System state controls integrated.

---

### 5.3 Error Handling & Notifications
**Objective**: Implement global error handling and user notifications.

**Tasks**:
- Create `src/components/ui/Toaster.tsx`:
  - Toast notification system for success/error messages
  - Auto-dismiss after 5 seconds
  - Close button
- Create `src/components/ui/use-toast.ts`:
  - Hook for showing toasts
  - Types for toast variants (default, success, error)
- Update API client to show toasts on errors:
  - 401 errors: redirect to login
  - 400 errors: show validation errors
  - 500 errors: show server error message
- Update all pages to show toasts:
  - Success messages after saves/deletes
  - Error messages for failed operations
- Use shadcn Toast components (add if needed)

**Deliverables**: Global toast notification system.

---

## Phase 6: Polish & Performance Optimization (Week 6)

### 6.1 Dark Mode Support
**Objective**: Ensure full dark mode support across all pages.

**Tasks**:
- Verify all components support dark mode via existing CSS variables
- Add theme toggle to sidebar (optional enhancement)
- Test all pages in both light and dark modes
- Ensure all shadcn/ui components work with both themes
- Verify Monaco Editor theme support (set based on system preference)

**Deliverables**: Full dark mode support verified.

---

### 6.2 Responsive Design
**Objective**: Ensure all pages work well on mobile and tablet.

**Tasks**:
- Test all pages on various screen sizes
- Adjust grid layouts for smaller screens:
  - Dashboard: 5-column grid → 2-column on tablet → 1-column on mobile
  - Usage: 4-column grid → 2-column → 1-column
  - Tables: Horizontal scroll on mobile
- Ensure touch-friendly buttons (min 44px height)
- Adjust sidebar behavior on mobile:
  - Auto-collapse on small screens
  - Add mobile menu button
- Verify all modals fit on small screens
- Add responsive breakpoints to all pages

**Deliverables**: Fully responsive design across all pages.

---

### 6.3 Performance Optimization
**Objective**: Optimize loading times and rendering performance.

**Tasks**:
- Implement React.memo for expensive components
- Add loading states for all API calls
- Debounce search inputs (Logs, Models, Keys, Providers)
- Implement infinite scroll for Logs page (replace pagination or as alternative)
- Optimize re-renders with useCallback and useMemo
- Lazy load Monaco Editor (only load when Config/Debug/Errors page is opened)
- Add skeleton loaders while data is loading
- Optimize chart rendering (limit data points)

**Deliverables**: Optimized performance across all pages.

---

### 6.4 Accessibility
**Objective**: Ensure accessibility compliance (WCAG AA).

**Tasks**:
- Add proper ARIA labels to all interactive elements
- Ensure keyboard navigation works throughout the app
- Add focus indicators to all interactive elements
- Ensure color contrast ratios meet WCAG AA
- Add alt text to all images
- Test with screen reader
- Ensure all modals trap focus
- Add proper heading hierarchy

**Deliverables**: Fully accessible UI.

---

## Phase 7: Final Polish & Documentation (Week 7)

### 7.1 Visual Polish
**Objective**: Enhance visual appeal and consistency.

**Tasks**:
- Add smooth page transitions
- Enhance hover effects on all interactive elements
- Add loading spinners for all async operations
- Ensure consistent spacing using existing design tokens
- Add subtle animations (fade-in, slide-up)
- Polish chart tooltips and legends
- Enhance badge colors and statuses
- Add icon consistency across all pages

**Deliverables**: Polished and visually consistent UI.

---

### 7.2 User Experience Enhancements
**Objective**: Improve overall user experience.

**Tasks**:
- Add keyboard shortcuts:
  - `Cmd/Ctrl + K` to search
  - `Cmd/Ctrl + /` to open command palette (optional)
  - `Escape` to close modals
- Add undo functionality for destructive actions (optional)
- Add confirmations for all destructive actions
- Improve error messages to be more actionable
- Add helpful hints and tooltips
- Implement form validation with inline errors
- Add bulk operations where applicable (e.g., delete multiple logs)

**Deliverables**: Enhanced user experience.

---

### 7.3 Documentation
**Objective**: Document implementation details and usage.

**Tasks**:
- Update `FEDESIGN.md` with any deviations from original design
- Create `README.md` for the frontend with:
  - Setup instructions
  - How to add new pages
  - How to add new components
  - API usage examples
  - Component library documentation
- Document all custom hooks in `src/hooks/`
- Add inline code comments where necessary
- Document environment variables (if any)
- Document build and deployment process

**Deliverables**: Complete documentation.

---

### 7.4 Testing & Bug Fixes
**Objective**: Final testing and bug fixing.

**Tasks**:
- Manual testing of all pages and features
- Test all CRUD operations
- Test error handling
- Test real-time updates (SSE)
- Test on different browsers (Chrome, Firefox, Safari, Edge)
- Test on different screen sizes
- Fix any bugs discovered during testing
- Ensure typecheck passes: `bun run typecheck`
- Ensure build works: `bun run build`

**Deliverables**: Fully tested and bug-free application.

---

## Summary

This 7-phase implementation plan covers all aspects of the Plexus UI as specified in `FEDESIGN.md`, leveraging the existing shadcn/ui components, Lucide React icons, and type-safe API client.

### Key Design Decisions

1. **shadcn/ui Components**: Use existing shadcn components and add missing ones rather than building custom components from references. This ensures consistency and reduces maintenance burden.

2. **API Integration**: Strict use of `openapi-fetch` with generated types from `lib/management.d.ts` ensures type safety and prevents API drift.

3. **State Management**: React Context API for authentication and sidebar state, as specified. Local storage for persistence.

4. **Styling**: Maintain existing CSS variables from `app.css` for consistent theming across all components.

5. **Real-time Updates**: SSE from `/events` endpoint for real-time log updates.

6. **Monaco Editor**: For YAML/JSON editing in Config, Debug, and Errors pages.

7. **Charts**: Recharts for all data visualization (Dashboard, Usage).

### Deliverables by Phase

| Phase | Weeks | Key Deliverables |
|-------|-------|-------------------|
| 1 | 1 | Foundation: Layout, Routing, Auth, API Client |
| 2 | 1 | Core Pages: Login, Dashboard, Usage |
| 3 | 1 | Configuration: Providers, Models, Keys |
| 4 | 1 | Logs & Monitoring: Logs, Debug, Errors |
| 5 | 1 | Settings: Config Editor, System State, Error Handling |
| 6 | 1 | Polish: Dark Mode, Responsive, Performance, Accessibility |
| 7 | 1 | Final: Visual Polish, UX Enhancements, Documentation, Testing |

### Total Timeline
**7 weeks** to complete full implementation from foundation to production-ready application.

### Next Steps
Begin Phase 1 with dependency verification and shadcn/ui component setup.
