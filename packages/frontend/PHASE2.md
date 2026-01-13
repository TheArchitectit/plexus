# Phase 2: Core Pages - Dashboard, Usage, Login (Week 2)

## Overview
This phase implements the core pages of the Plexus UI: Login page for authentication, Dashboard for real-time system overview, and Usage page for comprehensive analytics.

---

## 2.1 Login Page
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

## 2.2 Dashboard Page
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

## 2.3 Usage Page
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

## Summary

**Duration**: 1 week

**Key Deliverables**:
- Login page with authentication using AuthContext
- Dashboard with 6 stat cards, service alerts, and recent activity chart
- RecentActivityChart component using Recharts
- Usage page with 8 charts (AreaChart, Stacked AreaChart, PieChart)
- Time range selectors for Dashboard and Usage
- Real-time data fetching and auto-refresh (30 seconds)

**Next Steps**: Begin Phase 3 - Configuration Management (Providers, Models, Keys)
