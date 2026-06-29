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
      clicks: {
        Row: {
          created_at: string
          host_startup_id: string | null
          id: string
          shown_startup_id: string
        }
        Insert: {
          created_at?: string
          host_startup_id?: string | null
          id?: string
          shown_startup_id: string
        }
        Update: {
          created_at?: string
          host_startup_id?: string | null
          id?: string
          shown_startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_host_startup_id_fkey"
            columns: ["host_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_shown_startup_id_fkey"
            columns: ["shown_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      impressions: {
        Row: {
          created_at: string
          host_startup_id: string | null
          id: string
          shown_startup_id: string
        }
        Insert: {
          created_at?: string
          host_startup_id?: string | null
          id?: string
          shown_startup_id: string
        }
        Update: {
          created_at?: string
          host_startup_id?: string | null
          id?: string
          shown_startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impressions_host_startup_id_fkey"
            columns: ["host_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressions_shown_startup_id_fkey"
            columns: ["shown_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          consumed_at: string | null
          created_at: string
          dodo_payment_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          dodo_payment_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          dodo_payment_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      startups: {
        Row: {
          banned: boolean
          created_at: string
          description: string
          id: string
          logo_url: string | null
          name: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["startup_status"]
          strike_count: number
          updated_at: string
          user_id: string
          warn_expires_at: string | null
          warned_at: string | null
          website_url: string
          widget_hidden_at: string | null
          widget_last_heartbeat_at: string | null
        }
        Insert: {
          banned?: boolean
          created_at?: string
          description: string
          id?: string
          logo_url?: string | null
          name: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["startup_status"]
          strike_count?: number
          updated_at?: string
          user_id: string
          warn_expires_at?: string | null
          warned_at?: string | null
          website_url: string
          widget_hidden_at?: string | null
          widget_last_heartbeat_at?: string | null
        }
        Update: {
          banned?: boolean
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["startup_status"]
          strike_count?: number
          updated_at?: string
          user_id?: string
          warn_expires_at?: string | null
          warned_at?: string | null
          website_url?: string
          widget_hidden_at?: string | null
          widget_last_heartbeat_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_prepaid_listing: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      startup_status: "pending" | "approved" | "rejected"
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
      startup_status: ["pending", "approved", "rejected"],
    },
  },
} as const
