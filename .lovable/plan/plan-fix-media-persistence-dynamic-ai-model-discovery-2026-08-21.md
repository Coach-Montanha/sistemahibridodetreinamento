# Plan: Fix Media Persistence & Dynamic AI Model Discovery

This plan addresses the persistence failure of uploaded media and the dynamic discovery of AI models via the Lovable AI Gateway to ensure system stability.

## User Review Required

> [!IMPORTANT]
> - We will modify the **Bulk Media Upload** process to ensure records are created for every file uploaded to Storage.
> - We will update the **AI Gateway** calls to use dynamic model selection based on the project's allowed models, avoiding hardcoded legacy IDs.

## Proposed Changes

### Backend: Media Persistence Fix (`src/lib/bulk-media.functions.ts`)
- Enhance `uploadMediaBatch` to handle atomic operations better.
- Ensure `exercise_media` records are created even if no exercise match is found (store as "unlinked").
- Add a "check persistence" step to verify Storage objects before returning success.

### Backend: AI Discovery (`src/lib/ai-discovery.server.ts` - New)
- Implement `getBestAvailableModel`: A utility to list models from the AI Gateway and pick the best Gemini or OpenAI model.
- Replace hardcoded model IDs in `src/lib/prescricao-ia.server.ts` and `src/lib/hibrido-ia.server.ts`.

### Backend: Storage Inventory (`src/lib/correlation.functions.ts`)
- Optimize `startMediaInventory` to handle large buckets via recursive listing or pagination.
- Add validation to ensure it's not listing cached client-side state but real Storage objects.

### Frontend: UI Reliability (`src/components/admin/ExerciseBulkMediaUpload.tsx`)
- Refactor state management to distinguish between `selected`, `uploading`, `uploaded` (Storage confirm), `registered` (DB confirm), and `linked`.
- Add a "Resume/Retry" mechanism for failed uploads in a large batch.
- Persist the upload queue in `SessionStorage` during long operations to prevent data loss on accidental reloads.

### Frontend: Sincronizar Mídias (`src/components/admin/MediaCorrelationDashboard.tsx`)
- Add a "Total Persisted in Storage" counter to compare with DB records.
- Implement a detailed view of the Inventory Job steps.
