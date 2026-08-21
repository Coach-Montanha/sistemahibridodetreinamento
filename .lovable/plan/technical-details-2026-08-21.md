---
name: Audit Fixes v2
description: Fixing critical bugs identified in the v2 audit report.
---

## Technical Details

### 1. Media Import Persistence
- **Issue**: Media upload queue was stored in `sessionStorage`, causing data loss on refresh/multi-tab usage.
- **Fix**: Created `media_import_jobs` and `media_import_items` tables.
- **Impact**: Uploads can now be resumed across sessions and progress is globally tracked for the coach.

### 2. Coach ID Resolution
- **Issue**: Divergence between `authUserId` and `coachId` caused inventory/correlation counts to return zero.
- **Fix**: Standardized all server functions to use `auth_coach_id_for_user` RPC.
- **Impact**: Inventory and Correlation features now correctly identify the coach's data.

### 3. Hybrid Generation Contract
- **Issue**: Inconsistent return formats between different generation paths.
- **Fix**: Unified `hibrido-ia.server.ts` to strictly enforce the `{ sessoes: [...], notes: "..." }` contract and improved fallback ID selection.
- **Impact**: Eliminated "Zod Validation Error" and "No structured session returned" errors.

### 4. Security Hardening
- **Issue**: Broad RLS policies on media tables.
- **Fix**: Restricted `exercise_media` and storage bucket access to verified `coach_id`.
