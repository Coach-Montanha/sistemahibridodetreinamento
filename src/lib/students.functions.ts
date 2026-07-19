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

    // Try to find existing auth user by email
    let authUserId: string | null = null;
    const tempPassword = randomPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome: data.nome, role: "student" },
    });
    if (createErr) {
      // maybe already exists — try to look up
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (!found) throw createErr;
      authUserId = found.id;
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
      tempPassword: createErr ? null : tempPassword,
      alreadyExisted: !!createErr,
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