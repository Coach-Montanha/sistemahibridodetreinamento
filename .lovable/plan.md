# Plan: Hybrid Generation and Advanced Export

Improve the generation and export workflow for Hybrid and Kettlebell Fitness programs by ensuring continuity between productions and maintaining visual consistency in exports.

## User Requirements
- **Espelhar Produção Anterior**: The system should automatically match the number of sessions from the last complete production when continuing a program.
- **Posicionamento Rígido por Bloco**: Block coordinates (X/Y) in the canvas should be preserved for new sessions based on their keys (matching the structure of the last production).
- **Última Estrutura por Dia**: The generation motor should prioritize the template (Molde) of the last session of each specific weekday (Monday, Tuesday, etc.) found in the history.
- **Improved Export**: Ensure font scaling and positioning are correctly applied to all export formats (PNG, JPG, PDF).

## Proposed Changes

### 1. Advanced History Extraction
- Modify `app.programas.tsx` to extract the structural template and the number of sessions from the *entire* last production (all sessions in the history) instead of just the very last session.
- Group history by "Day of Week" to ensure that when generating a new "Monday", it uses the structure of the previous "Monday".

### 2. Motor Logic (Server-side)
- Update `hibrido-ia.server.ts` to accept the mirrored session count.
- Refine the prompt to emphasize "Troca Obrigatória" (Mandatory Exchange) of exercises while maintaining the rigid structure.

### 3. Rigid Positioning Persistence
- Ensure `UnifiedCanvasEditor.tsx` and `image-export.ts` use the program-level saved layout (`program-image-layout:${programId}`) as a source of truth for new blocks.
- Map blocks by a combination of `chave` and `ordem` if the keys are generic, ensuring new sessions "inherit" the positions of their predecessors.

### 4. UI Refinement
- Update `PrescreverIaDialog.tsx` to display the "Espelhar última produção" option and show the detected historical templates.

## Technical Details
- **Template Mapping**: `src/routes/_authenticated/app.programas.tsx` will now compute `numeroSessoes` as `total_sessions_in_history`.
- **Canvas Inheritance**: `src/lib/program-image-layout.ts` already supports per-program storage; the logic in `image-export.ts` will be adjusted to better handle block mapping when new IDs are generated.
- **Dynamic Font Scaling**: Verification that the `fontSize` multiplier is consistently applied across all export utilities.

## Verification Plan
- **Manual Test**: Create a program with 3 sessions (Mon, Wed, Fri), generate a layout, then use "Continuar gerando" to verify it proposes 3 new sessions using the exact same structure and maintaining block positions in the editor.
- **Export Test**: Verify that the generated PNG/PDF maintains the font scale set in the slider.