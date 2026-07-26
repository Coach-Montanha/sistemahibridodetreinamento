import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoach } from "@/hooks/use-coach";

export const COACH_FILES_BUCKET = "coach-files";

export function useCoachFiles() {
  const { data: coach } = useCoach();
  return useQuery({
    queryKey: ["coach-files", coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(COACH_FILES_BUCKET)
        .list(coach!.id, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    },
  });
}

export function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}