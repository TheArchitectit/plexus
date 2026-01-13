# Phase 5: Configuration & System Settings (Week 5)

## Overview
This phase implements the direct YAML configuration editor, system state management controls, and global error handling with toast notifications.

---

## 5.1 Config Page (YAML Editor)
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

## 5.2 System State Management
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

## 5.3 Error Handling & Notifications
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

## Summary

**Duration**: 1 week

**Key Deliverables**:
- Config page with Monaco Editor for YAML editing
- YAML syntax highlighting and validation error display
- Save/Reset functionality with confirmation
- System state display on Dashboard (uptime, version, debug mode, health, cooldowns)
- Debug mode toggle with confirmation dialog
- Clear cooldowns functionality
- Provider enable/disable controls
- Global toast notification system (Toaster, use-toast hook)
- API client error handling with toast notifications
- Success/error toasts on all CRUD operations

**Next Steps**: Begin Phase 6 - Polish & Performance Optimization (Dark Mode, Responsive, Performance, Accessibility)
