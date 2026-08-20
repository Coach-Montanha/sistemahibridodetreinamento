# Plan for Fixing Generator Formats and Exercise Catalog

This plan addresses two critical issues:
1. Missing block formats in the Hybrid/KB Fitness constructor.
2. Incomplete and buggy Exercise Catalog (AI Catalog) with incorrect filters and missing pagination.

## Phase 1: Fix Block Formats Consistency

The goal is to ensure the "Add Block" menu in the Hybrid/KB Fitness constructor displays all active formats (built-in and custom) defined in Settings.

- **Unify Format Discovery:**
  - Update `src/lib/format-registry.ts` to export a robust `useAvailableFormats` hook that filters out inactive formats and correctly resolves labels.
  - Modify `src/components/programa-ia/ConstrutorMoldeDialog.tsx` to consume `presets` from `useFormatRegistry` instead of using static lists for the dropdown.
  - Implement a server function `getAvailableBlockFormats` in `src/lib/catalog-sync.functions.ts` to provide a single source of truth for the AI motors.

## Phase 2: Fix Exercise Catalog (AI Catalog)

The goal is to fix the "failed to parse filter" error, implement server-side pagination, and allow full editing/translation of exercises.

- **Fix Filter Error:**
  - Identify and fix the `not.in [object Object]` error in `src/lib/exercises-import.functions.ts` by using proper PostgREST syntax for exclusion.
  - Use `.not('id', 'in', '(...)')` with a comma-separated string or a subquery correctly formatted.

- **Server-side Pagination & Filtering:**
  - Update `CatalogReviewList.tsx` to support searching, status filtering (pending, approved, draft, etc.), and equipment/modality filters.
  - Ensure pagination handles the full 1,324+ records.

- **Side-by-Side Editor:**
  - Enhance `CatalogItemReview` in `CatalogReviewList.tsx` to show all technical fields (instructions, muscle groups, equipment mapping).
  - Add a "Translate Single" button in the review dialog to trigger Gemini for a specific item.
  - Ensure manual edits save as `human` source and `approved` status.

- **Projection Logic:**
  - Verify and harden the projection from `exercise_catalog` to `public.exercises`, ensuring it maps equipments correctly (e.g., "cable/machine/plate" to "Alternativos Musculação").

## Technical Details

- **Database:**
  - The `exercise_catalog` and `exercise_catalog_translations` tables are already present.
  - Ensure `RLS` policies allow coaches to manage their translations.
- **AI Integration:**
  - Use `Gemini 2.0 Flash` for technical translations.
  - Maintain the "Draft" status for AI-generated translations until approved by a human.

## Verification

1. **Formats:** Create a custom format in Settings and verify it appears in the Hybrid Session Builder.
2. **Catalog:** Open the AI Catalog, verify the table renders 50 items with pagination, and that filtering by "Draft" works.
3. **Translation:** Edit an exercise, save it, and verify it can be projected to the global library.
