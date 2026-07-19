export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_ingestion_jobs: {
        Row: {
          arquivo_origem: string | null
          coach_id: string
          criado_em: string
          id: string
          metodologia: Database["public"]["Enums"]["methodology_key"] | null
          resultado: Json | null
          status: string
        }
        Insert: {
          arquivo_origem?: string | null
          coach_id: string
          criado_em?: string
          id?: string
          metodologia?: Database["public"]["Enums"]["methodology_key"] | null
          resultado?: Json | null
          status?: string
        }
        Update: {
          arquivo_origem?: string | null
          coach_id?: string
          criado_em?: string
          id?: string
          metodologia?: Database["public"]["Enums"]["methodology_key"] | null
          resultado?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_ingestion_jobs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          coach_id: string
          expira_em: string | null
          group_id: string | null
          id: string
          liberado_em: string | null
          program_id: string | null
          program_week_id: string | null
          session_id: string | null
          student_id: string | null
        }
        Insert: {
          coach_id: string
          expira_em?: string | null
          group_id?: string | null
          id?: string
          liberado_em?: string | null
          program_id?: string | null
          program_week_id?: string | null
          session_id?: string | null
          student_id?: string | null
        }
        Update: {
          coach_id?: string
          expira_em?: string | null
          group_id?: string | null
          id?: string
          liberado_em?: string | null
          program_id?: string | null
          program_week_id?: string | null
          session_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_program_week_id_fkey"
            columns: ["program_week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      block_templates: {
        Row: {
          ativo: boolean
          coach_id: string | null
          config: Json
          criado_em: string
          duracao_min: number | null
          formato: Database["public"]["Enums"]["block_format"]
          id: string
          metodologia: Database["public"]["Enums"]["methodology_key"]
          nome: string
        }
        Insert: {
          ativo?: boolean
          coach_id?: string | null
          config?: Json
          criado_em?: string
          duracao_min?: number | null
          formato: Database["public"]["Enums"]["block_format"]
          id?: string
          metodologia: Database["public"]["Enums"]["methodology_key"]
          nome: string
        }
        Update: {
          ativo?: boolean
          coach_id?: string | null
          config?: Json
          criado_em?: string
          duracao_min?: number | null
          formato?: Database["public"]["Enums"]["block_format"]
          id?: string
          metodologia?: Database["public"]["Enums"]["methodology_key"]
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_members: {
        Row: {
          auth_user_id: string
          coach_id: string
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          auth_user_id: string
          coach_id: string
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          auth_user_id?: string
          coach_id?: string
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "coach_members_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          criado_em: string
          email: string
          external_studio_ref: string | null
          id: string
          logo_url: string | null
          nome: string
          plano: Database["public"]["Enums"]["coach_plan"]
          rodape_export: string | null
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          criado_em?: string
          email: string
          external_studio_ref?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plano?: Database["public"]["Enums"]["coach_plan"]
          rodape_export?: string | null
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          criado_em?: string
          email?: string
          external_studio_ref?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plano?: Database["public"]["Enums"]["coach_plan"]
          rodape_export?: string | null
        }
        Relationships: []
      }
      exercise_media: {
        Row: {
          criado_em: string
          exercise_id: string
          id: string
          ordem: number
          storage_path: string
          tipo: Database["public"]["Enums"]["media_kind"]
          url_publica: string | null
        }
        Insert: {
          criado_em?: string
          exercise_id: string
          id?: string
          ordem?: number
          storage_path: string
          tipo: Database["public"]["Enums"]["media_kind"]
          url_publica?: string | null
        }
        Update: {
          criado_em?: string
          exercise_id?: string
          id?: string
          ordem?: number
          storage_path?: string
          tipo?: Database["public"]["Enums"]["media_kind"]
          url_publica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          atualizado_em: string
          coach_id: string | null
          criado_em: string
          criado_por_ia: boolean
          equipamento: string[] | null
          grupos_musculares: string[] | null
          id: string
          instrucoes: string | null
          metodologias: Database["public"]["Enums"]["methodology_key"][]
          nivel: string | null
          nome_en: string | null
          nome_pt: string
          observacoes_tecnicas: string | null
          padrao_movimento: string | null
          unilateral: boolean
          variante_lado: string | null
        }
        Insert: {
          atualizado_em?: string
          coach_id?: string | null
          criado_em?: string
          criado_por_ia?: boolean
          equipamento?: string[] | null
          grupos_musculares?: string[] | null
          id?: string
          instrucoes?: string | null
          metodologias?: Database["public"]["Enums"]["methodology_key"][]
          nivel?: string | null
          nome_en?: string | null
          nome_pt: string
          observacoes_tecnicas?: string | null
          padrao_movimento?: string | null
          unilateral?: boolean
          variante_lado?: string | null
        }
        Update: {
          atualizado_em?: string
          coach_id?: string | null
          criado_em?: string
          criado_por_ia?: boolean
          equipamento?: string[] | null
          grupos_musculares?: string[] | null
          id?: string
          instrucoes?: string | null
          metodologias?: Database["public"]["Enums"]["methodology_key"][]
          nivel?: string | null
          nome_en?: string | null
          nome_pt?: string
          observacoes_tecnicas?: string | null
          padrao_movimento?: string | null
          unilateral?: boolean
          variante_lado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          coach_id: string
          criado_em: string
          escopo: string
          export_template_id: string | null
          formato: Database["public"]["Enums"]["export_format"]
          id: string
          program_id: string | null
          program_week_id: string | null
          session_id: string | null
          status: string
          storage_path: string | null
        }
        Insert: {
          coach_id: string
          criado_em?: string
          escopo: string
          export_template_id?: string | null
          formato: Database["public"]["Enums"]["export_format"]
          id?: string
          program_id?: string | null
          program_week_id?: string | null
          session_id?: string | null
          status?: string
          storage_path?: string | null
        }
        Update: {
          coach_id?: string
          criado_em?: string
          escopo?: string
          export_template_id?: string | null
          formato?: Database["public"]["Enums"]["export_format"]
          id?: string
          program_id?: string | null
          program_week_id?: string | null
          session_id?: string | null
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_export_template_id_fkey"
            columns: ["export_template_id"]
            isOneToOne: false
            referencedRelation: "export_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_program_week_id_fkey"
            columns: ["program_week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      export_templates: {
        Row: {
          coach_id: string
          criado_em: string
          formato: Database["public"]["Enums"]["export_format"]
          id: string
          layout_config: Json | null
          nome: string
          padrao: boolean
        }
        Insert: {
          coach_id: string
          criado_em?: string
          formato: Database["public"]["Enums"]["export_format"]
          id?: string
          layout_config?: Json | null
          nome: string
          padrao?: boolean
        }
        Update: {
          coach_id?: string
          criado_em?: string
          formato?: Database["public"]["Enums"]["export_format"]
          id?: string
          layout_config?: Json | null
          nome?: string
          padrao?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "export_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      generator_preferences: {
        Row: {
          blocos: Json
          coach_id: string
          created_at: string
          id: string
          metodologia: string
          updated_at: string
        }
        Insert: {
          blocos?: Json
          coach_id: string
          created_at?: string
          id?: string
          metodologia: string
          updated_at?: string
        }
        Update: {
          blocos?: Json
          coach_id?: string
          created_at?: string
          id?: string
          metodologia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generator_preferences_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          data_inicio: string | null
          eh_semana_especial: boolean
          id: string
          numero_semana: number
          observacoes: string | null
          program_id: string
          rotulo: string | null
        }
        Insert: {
          data_inicio?: string | null
          eh_semana_especial?: boolean
          id?: string
          numero_semana: number
          observacoes?: string | null
          program_id: string
          rotulo?: string | null
        }
        Update: {
          data_inicio?: string | null
          eh_semana_especial?: boolean
          id?: string
          numero_semana?: number
          observacoes?: string | null
          program_id?: string
          rotulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          coach_id: string
          criado_em: string
          data_inicio: string
          descricao: string | null
          duracao_semanas: number
          id: string
          metodologia: Database["public"]["Enums"]["methodology_key"]
          regras_progressao: Json | null
          status: Database["public"]["Enums"]["session_status"]
          titulo: string
        }
        Insert: {
          coach_id: string
          criado_em?: string
          data_inicio: string
          descricao?: string | null
          duracao_semanas?: number
          id?: string
          metodologia: Database["public"]["Enums"]["methodology_key"]
          regras_progressao?: Json | null
          status?: Database["public"]["Enums"]["session_status"]
          titulo: string
        }
        Update: {
          coach_id?: string
          criado_em?: string
          data_inicio?: string
          descricao?: string | null
          duracao_semanas?: number
          id?: string
          metodologia?: Database["public"]["Enums"]["methodology_key"]
          regras_progressao?: Json | null
          status?: Database["public"]["Enums"]["session_status"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      session_block_exercises: {
        Row: {
          carga_kg: number | null
          descanso_seg: number | null
          exercise_id: string | null
          id: string
          lado: string | null
          nome_livre: string | null
          observacoes: string | null
          ordem: number
          pct_1rm: number | null
          reps: string | null
          series: number | null
          session_block_id: string
        }
        Insert: {
          carga_kg?: number | null
          descanso_seg?: number | null
          exercise_id?: string | null
          id?: string
          lado?: string | null
          nome_livre?: string | null
          observacoes?: string | null
          ordem: number
          pct_1rm?: number | null
          reps?: string | null
          series?: number | null
          session_block_id: string
        }
        Update: {
          carga_kg?: number | null
          descanso_seg?: number | null
          exercise_id?: string | null
          id?: string
          lado?: string | null
          nome_livre?: string | null
          observacoes?: string | null
          ordem?: number
          pct_1rm?: number | null
          reps?: string | null
          series?: number | null
          session_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_block_exercises_session_block_id_fkey"
            columns: ["session_block_id"]
            isOneToOne: false
            referencedRelation: "session_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      session_blocks: {
        Row: {
          block_template_id: string | null
          config: Json | null
          criado_em: string
          duracao_min: number | null
          formato: Database["public"]["Enums"]["block_format"]
          id: string
          ordem: number
          session_id: string
          titulo: string | null
        }
        Insert: {
          block_template_id?: string | null
          config?: Json | null
          criado_em?: string
          duracao_min?: number | null
          formato: Database["public"]["Enums"]["block_format"]
          id?: string
          ordem: number
          session_id: string
          titulo?: string | null
        }
        Update: {
          block_template_id?: string | null
          config?: Json | null
          criado_em?: string
          duracao_min?: number | null
          formato?: Database["public"]["Enums"]["block_format"]
          id?: string
          ordem?: number
          session_id?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_blocks_block_template_id_fkey"
            columns: ["block_template_id"]
            isOneToOne: false
            referencedRelation: "block_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          criado_em: string
          feedback: string | null
          id: string
          rpe: number | null
          session_id: string
          student_id: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          criado_em?: string
          feedback?: string | null
          id?: string
          rpe?: number | null
          session_id: string
          student_id: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          criado_em?: string
          feedback?: string | null
          id?: string
          rpe?: number | null
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          atualizado_em: string
          criado_em: string
          data: string | null
          gerada_automaticamente: boolean
          id: string
          numero_dia: number
          program_week_id: string
          status: Database["public"]["Enums"]["session_status"]
          titulo: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data?: string | null
          gerada_automaticamente?: boolean
          id?: string
          numero_dia: number
          program_week_id: string
          status?: Database["public"]["Enums"]["session_status"]
          titulo?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data?: string | null
          gerada_automaticamente?: boolean
          id?: string
          numero_dia?: number
          program_week_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_program_week_id_fkey"
            columns: ["program_week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      student_group_members: {
        Row: {
          group_id: string
          student_id: string
        }
        Insert: {
          group_id: string
          student_id: string
        }
        Update: {
          group_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_groups: {
        Row: {
          coach_id: string
          id: string
          nome: string
        }
        Insert: {
          coach_id: string
          id?: string
          nome: string
        }
        Update: {
          coach_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_groups_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          auth_user_id: string | null
          coach_id: string
          criado_em: string
          email: string
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          senha_temporaria: boolean
          status: Database["public"]["Enums"]["student_access_status"]
          telefone: string | null
        }
        Insert: {
          auth_user_id?: string | null
          coach_id: string
          criado_em?: string
          email: string
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          senha_temporaria?: boolean
          status?: Database["public"]["Enums"]["student_access_status"]
          telefone?: string | null
        }
        Update: {
          auth_user_id?: string | null
          coach_id?: string
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          senha_temporaria?: boolean
          status?: Database["public"]["Enums"]["student_access_status"]
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_coach_id: { Args: never; Returns: string }
      auth_student_id: { Args: never; Returns: string }
      merge_exercises: {
        Args: { _duplicate_ids: string[]; _keeper_id: string }
        Returns: undefined
      }
      student_can_read_program: {
        Args: { _program_id: string }
        Returns: boolean
      }
      student_can_read_program_week: {
        Args: { _pw_id: string }
        Returns: boolean
      }
      student_can_read_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      block_format:
        | "preparacao_movimento"
        | "forca_tecnica_pct"
        | "emom"
        | "e2mom"
        | "amrap"
        | "circuito"
        | "kb_timed_sets"
        | "metcon"
        | "bodybuilding_sets"
        | "finalizador"
        | "livre"
      coach_plan: "trial" | "individual" | "studio" | "revenda"
      export_format: "pdf" | "xlsx" | "docx"
      media_kind: "video" | "imagem" | "gif"
      methodology_key:
        | "hibrido"
        | "kettlebell_sport"
        | "kettlebell_fitness"
        | "levantamento_peso"
        | "musculacao"
      session_status: "rascunho" | "publicada" | "arquivada"
      student_access_status: "convidado" | "ativo" | "inativo" | "expirado"
      user_role: "super_admin" | "coach" | "assistente" | "aluno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      block_format: [
        "preparacao_movimento",
        "forca_tecnica_pct",
        "emom",
        "e2mom",
        "amrap",
        "circuito",
        "kb_timed_sets",
        "metcon",
        "bodybuilding_sets",
        "finalizador",
        "livre",
      ],
      coach_plan: ["trial", "individual", "studio", "revenda"],
      export_format: ["pdf", "xlsx", "docx"],
      media_kind: ["video", "imagem", "gif"],
      methodology_key: [
        "hibrido",
        "kettlebell_sport",
        "kettlebell_fitness",
        "levantamento_peso",
        "musculacao",
      ],
      session_status: ["rascunho", "publicada", "arquivada"],
      student_access_status: ["convidado", "ativo", "inativo", "expirado"],
      user_role: ["super_admin", "coach", "assistente", "aluno"],
    },
  },
} as const
