# Plan - Autonomy from GitHub Catalog

The user wants to cut the connection with the GitHub exercise catalog while maintaining all exercises in their personal database and ensuring data integrity for training production.

## Database Changes
- None required. All exercises currently used in sessions are already in the `exercises` table. The `exercise_catalog` table acts as a staging area. We will keep the data in both, but remove the synchronization mechanism.

## Frontend Changes
- **Exercise Management (`src/routes/_authenticated/app.exercicios.tsx`)**:
    - Remove references to GitHub in descriptions.
    - Remove the "Duplicados" button that leads to the catalog-based integrity tools if they are no longer desired, or repurpose it for local deduplication only.
- **Import Manager (`src/components/exercises/ExerciseImportManager.tsx`)**:
    - Remove the "GitHub" import button.
    - Remove the stat comparison between "Fonte vs Catálogo" (GitHub dataset URL).
    - Keep the "Projetar Aprovados" if there are still pending items in the catalog that the user might want to move to their local database one last time.

## Backend Changes (Server Functions)
- **`src/lib/exercises-import.functions.ts`**:
    - Deprecate/Empty `importExercises` to prevent any further GitHub sync.
    - Keep `projectApprovedExercises` so existing catalog items can still be moved to the main database.

## Technical Details
- The connection to GitHub is primarily through `ExerciseImportManager.tsx` fetching the raw JSON from `https://raw.githubusercontent.com/...`.
- I will disable the import functionality and remove the dataset URL references.
- I will ensure existing `exercises` remain untouched and fully editable.
