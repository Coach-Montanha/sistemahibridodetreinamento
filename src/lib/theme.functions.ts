import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const getVisualTheme = createServerFn({ method: "GET" })
  .handler(async () => {
    // In a real scenario, we'd fetch from Supabase if we had a column.
    // For now, we rely on the client-side preference and localStorage.
    // This is a placeholder for future server-side persistence.
    return { theme: "padrao" };
  });

export const updateVisualTheme = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ theme: z.enum(["padrao", "pulse"]) }).parse(data))
  .handler(async ({ data }) => {
    // Placeholder for database update
    return { success: true, theme: data.theme };
  });
