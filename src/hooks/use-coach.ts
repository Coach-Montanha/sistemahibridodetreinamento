import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCoach() {
  return useQuery({
    queryKey: ["coach", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("coaches")
        .select("*")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}