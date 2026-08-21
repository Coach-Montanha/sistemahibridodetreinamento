# Plan: Automated Media Correlation & Inventory Report

This plan implements an automated routine to correlate existing storage media (GIFs/Videos) with imported exercises without re-uploading them. It includes a dry-run report and an administrative dashboard for review and batch updates.

## User Review Required

> [!IMPORTANT]
> - The correlation logic primarily uses `source_id` (from the dataset) and file basenames. If your filenames don't match these, the correlation will fall back to "Manual Review".
> - We will create two new tables (`media_correlation_jobs`, `media_correlation_items`) to track these processes safely.

## Proposed Changes

### Database Schema (Migrations)
- Create `public.media_correlation_jobs` to track correlation runs (coach_id, status, stats).
- Create `public.media_correlation_items` to store individual matches (job_id, storage_path, matched_exercise_id, match_type, status).
- Enable RLS and add proper `GRANT`s for `authenticated` and `service_role`.

### Backend Implementation (`src/lib/correlation.functions.ts`)
- Implement `inventoryStorageMedia`: Recursively lists the `exercise-media` bucket (respecting coach isolation).
- Implement `analyzeCorrelation`: A server function that compares the inventory against `public.exercises` and `exercise_catalog`.
  - **Deterministic Match**: Matches `source_id` or `source_key` found in filename/metadata.
  - **Exact Match**: Filename (without extension) matches `nome_en` or `nome_pt`.
  - **Ambiguous Match**: Multiple exercises share similar names.
- Implement `applyCorrelation`: Batch updates `exercise_media` for confirmed matches.

### Frontend Dashboard (`src/components/admin/MediaCorrelationDashboard.tsx`)
- New administrative view under **Settings > Correlate Media**.
- **Inventory Summary**: Bucket name, object count (GIFs/Videos/Thumbnails), and top 5 paths.
- **Correlation Report**: Table showing matches (Exact vs Ambiguous vs No Match).
- **Actions**: "Run Inventory", "Apply Exact Matches", and "Manual Review" for ambiguities.

## Technical Details

### Correlation Strategy
1. **Source ID**: If the filename contains a UUID or numeric ID matching `exercises.source_id`.
2. **Catalog Reference**: Matches `exercise_catalog.source_exercise_id`.
3. **Basename Sanitization**: `cable-chest-press.gif` -> `Cable Chest Press`.

### Storage Isolation
The routine will only list files under `${coach_id}/` in the bucket to prevent cross-tenant access, maintaining security compliance.

### Performance
- Paginated listing of storage objects to handle large catalogs (>1000 items).
- Individual items stored in `media_correlation_items` to allow resumable processing and individual user overrides.
