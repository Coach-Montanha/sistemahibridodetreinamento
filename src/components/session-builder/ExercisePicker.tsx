import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export function ExercisePicker({
  onPick,
}: {
  onPick: (ex: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
    }, 250);
    return () => clearTimeout(handler);
  }, [q]);

  const { data = [], isFetching } = useQuery({
    queryKey: ["exercise-picker", debouncedQ],
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("id, nome_pt, nome_en, grupo_muscular, equipamento, exercise_media(*)")
        .order("nome_pt")
        .limit(150);

      if (debouncedQ.trim()) {
        query = query.or(`nome_pt.ilike.%${debouncedQ.trim()}%,nome_en.ilike.%${debouncedQ.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Adicionar exercício
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar exercício..." value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
            <CommandGroup>
              {data.map((ex) => (
                <CommandItem
                  key={ex.id}
                  onSelect={() => {
                    onPick(ex);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {ex.nome_pt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}