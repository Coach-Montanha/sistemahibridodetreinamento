# Plan - Dynamic Block Formats and Set Types Support

The objective is to fix the `Zod Validation Error` when using custom block formats and set types in the AI-powered Hybrid and Bodybuilding prescription engines. This will be achieved by converting the remaining static `z.enum` validations to dynamic `z.string()` types and ensuring the AI prompt receives all active custom presets from the registry.

## Proposed Changes

### Logic & Backend
- **src/lib/methodology.ts**: Change `BlockFormat` and `SetType` types from union literals to `string` to allow dynamic IDs.
- **src/lib/prescricao-ia.functions.ts**: Update the `INPUT` schema in `prescribeTrainingWithAi` to ensure it accepts dynamic metadata and that the Hibrido motor correctly processes the custom registry.
- **src/lib/prescricao-ia.server.ts**: Refactor the normalization logic to be format-agnostic, using labels from the registry instead of hardcoded strings.
- **src/lib/hibrido-ia.server.ts**: Update the prompt generator to include all custom block formats currently registered in the user's system so the AI knows how to use them.

### Data Validation
- Ensure that the `sessaoTemplate` validation in all server functions uses `z.string()` for the `formato` field instead of a restricted `z.enum`.

## Technical Details
- The AI prompt for Hybrid training will be updated to include a "Dynamic Registry" section, listing every custom block format ID and its label.
- Normalization will fallback to the ID if no specific logic is found for a custom format, preserving the structure requested by the coach.
- Use `localStorage` to fetch the registry on the client before calling the server function, passing it as a parameter since server functions don't have access to browser storage.

## Questions & Scope
- All block formats will be allowed (no restricted enums).
- The AI will strictly follow the provided molde (template) as requested.
