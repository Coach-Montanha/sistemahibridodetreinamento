import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const inviteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { nome: string; email: string; telefone?: string }) => data)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    const { data: coach, error: coachErr } = await context.supabase
      .from("coaches")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (coachErr) throw coachErr;
    if (!coach) throw new Error("Coach não encontrado para o usuário atual");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let authUserId: string | null = null;
    const tempPassword = randomPassword();
    let alreadyExisted = false;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome: data.nome, role: "student" },
    });

    if (createErr) {
      // Provavelmente o e-mail já existe. Buscar direto por e-mail sem varrer a base.
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        // @ts-expect-error - filter é aceito pelo admin API mesmo quando não tipado
        filter: `email.eq.${email}`,
      });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (listErr || !found) {
        // Mensagem genérica: não vazar se o e-mail existe ou não
        throw new Error("Não foi possível convidar este e-mail. Verifique e tente novamente.");
      }

      // Bloquear reaproveitamento de contas que já são coach
      const { data: coachOwner } = await supabaseAdmin
        .from("coaches")
        .select("id")
        .eq("auth_user_id", found.id)
        .maybeSingle();
      if (coachOwner) {
        throw new Error("Este e-mail pertence a um coach e não pode ser adicionado como aluno.");
      }

      // Bloquear se já é aluno de outro coach
      const { data: otherStudent } = await supabaseAdmin
        .from("students")
        .select("id, coach_id")
        .eq("auth_user_id", found.id)
        .neq("coach_id", coach.id)
        .maybeSingle();
      if (otherStudent) {
        throw new Error("Este e-mail já é aluno de outro coach.");
      }

      authUserId = found.id;
      alreadyExisted = true;
    } else {
      authUserId = created.user!.id;
    }

    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .upsert(
        {
          coach_id: coach.id,
          nome: data.nome,
          email,
          telefone: data.telefone ?? null,
          auth_user_id: authUserId,
          status: "ativo",
          senha_temporaria: true,
        },
        { onConflict: "coach_id,email" },
      )
      .select()
      .single();
    if (sErr) throw sErr;

    return {
      student,
      tempPassword: alreadyExisted ? null : tempPassword,
      alreadyExisted,
    };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const assignSessionToStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { student_id: string; session_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: coach } = await context.supabase
      .from("coaches")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!coach) throw new Error("Coach não encontrado");
    const { error } = await context.supabase.from("assignments").insert({
      coach_id: coach.id,
      session_id: data.session_id,
      student_id: data.student_id,
    });
    if (error) throw error;
    return { ok: true };
  });

export const assignProgramToStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { student_id: string; program_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: coach } = await context.supabase
      .from("coaches")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!coach) throw new Error("Coach não encontrado");
    const { error } = await context.supabase.from("assignments").insert({
      coach_id: coach.id,
      program_id: data.program_id,
      student_id: data.student_id,
    });
    if (error) throw error;
    return { ok: true };
  });

export const unassign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assignments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });