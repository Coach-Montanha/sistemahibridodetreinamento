/**
 * Upsert único e transacional-seguro para exercise_catalog_translations.
 * A tabela tem UNIQUE (catalog_exercise_id, locale) — nunca usar INSERT simples.
 */

export type UpsertTranslationArgs = {
  catalogId: string;
  fields: Record<string, unknown>;
  status: "draft" | "approved";
  source: "ai" | "human";
  model?: string | null;
  locale?: string;
};

export async function upsertCatalogTranslation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  args: UpsertTranslationArgs,
): Promise<{ translationId: string }> {
  const locale = args.locale ?? "pt-BR";
  const payload: Record<string, unknown> = {
    ...args.fields,
    catalog_exercise_id: args.catalogId,
    locale,
    translation_status: args.status,
    translation_source: args.source,
    ...(args.model ? { translation_model: args.model } : {}),
    updated_at: new Date().toISOString(),
  };

  // 1. Tenta atualizar a linha existente pelo par (catalog_exercise_id, locale).
  const { data: existente } = await supabaseAdmin
    .from("exercise_catalog_translations")
    .select("id")
    .eq("catalog_exercise_id", args.catalogId)
    .eq("locale", locale)
    .maybeSingle();

  if (existente?.id) {
    const { data, error } = await supabaseAdmin
      .from("exercise_catalog_translations")
      .update(payload)
      .eq("id", existente.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await marcarAtiva(supabaseAdmin, args.catalogId, data.id);
    return { translationId: data.id };
  }

  // 2. Não existe: insere. Em corrida (23505), relê e atualiza.
  const { data, error } = await supabaseAdmin
    .from("exercise_catalog_translations")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if ((error as any).code === "23505") {
      const { data: linha } = await supabaseAdmin
        .from("exercise_catalog_translations")
        .select("id")
        .eq("catalog_exercise_id", args.catalogId)
        .eq("locale", locale)
        .single();
      const { data: atualizada, error: upErr } = await supabaseAdmin
        .from("exercise_catalog_translations")
        .update(payload)
        .eq("id", linha.id)
        .select("id")
        .single();
      if (upErr) throw new Error(upErr.message);
      await marcarAtiva(supabaseAdmin, args.catalogId, atualizada.id);
      return { translationId: atualizada.id };
    }
    throw new Error(error.message);
  }

  await marcarAtiva(supabaseAdmin, args.catalogId, data.id);
  return { translationId: data.id };
}

async function marcarAtiva(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  catalogId: string,
  translationId: string,
) {
  await supabaseAdmin
    .from("exercise_catalog")
    .update({ active_translation_id: translationId, updated_at: new Date().toISOString() })
    .eq("id", catalogId);
}
