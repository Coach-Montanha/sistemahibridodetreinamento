# Plan - Autonomy from GitHub Catalog

The user wants to cut the connection with the GitHub exercise catalog while maintaining all exercises in their personal database and ensuring data integrity for training production.

## Database Changes
- None required. All exercises currently used in sessions are already in the `exercises` table. The `exercise_catalog` table acts as a staging area. We will keep the data in both, but remove the synchronization mechanism.

## Frontend Changes
- **Exercise Management (`src/routes/_authenticated/app.exercicios.tsx`)**:
    - Remove references to GitHub in descriptions.
    - Remove the "Duplicados" button that leads to the catalog-based integrity tools if they are no longer desired, or repurpose it for local deduplication only.
    - Disable/Remove the logic that refers to `exercise_catalog` for "Clone-on-Write" if we want exercises to be fully independent now. (Wait, the user said "cut the connection", which usually means the "Import from GitHub" feature).
- **Import Manager (`src/components/exercises/ExerciseImportManager.tsx`)**:
    - Remove the "GitHub" import button.
    - Remove the stat comparison between "Fonte vs Catálogo" (GitHub dataset URL).
    - Keep the "Projetar Aprovados" if there are still pending items in the catalog that the user might want to move to their local database one last time, or hide the whole manager if the catalog is considered "done".

## Backend Changes (Server Functions)
- **`src/lib/exercises-import.functions.ts`**:
    - Deprecate `importExercises`.
    - Keep `projectApprovedExercises` for one last migration if needed, but remove the dataset fetching logic.
- **`src/lib/catalog-translate-core.server.ts`** & **`src/lib/catalog-translation.server.ts`**:
    - These relate to translating the catalog. If we cut the GitHub connection, we won't be importing new items to translate.

## User-Facing Text Updates
- Update descriptions in the Exercise Bank to reflect that exercises are now part of a standalone personal database.

## Technical Details
- The connection to GitHub is primarily through `ExerciseImportManager.tsx` fetching the raw JSON from `https://raw.githubusercontent.com/...`.
- I will disable the import functionality and remove the dataset URL references.
- I will ensure existing `exercises` remain untouched and fully editable.

## Refinement
1. Modify `src/routes/_authenticated/app.exercicios.tsx` to remove GitHub mention.
2. Modify `src/components/exercises/ExerciseImportManager.tsx` to remove GitHub sync UI.
3. Remove/Update descriptions related to the "Dataset" source.
