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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      content_reports: {
        Row: {
          created_at: string
          id: string
          report_details: string | null
          report_reason: Database["public"]["Enums"]["report_reason"]
          status: string
          story_content: string
          story_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_details?: string | null
          report_reason: Database["public"]["Enums"]["report_reason"]
          status?: string
          story_content: string
          story_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_details?: string | null
          report_reason?: Database["public"]["Enums"]["report_reason"]
          status?: string
          story_content?: string
          story_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_stories: {
        Row: {
          content: string
          created_at: string
          id: string
          reading_level: string
          theme: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reading_level: string
          theme: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reading_level?: string
          theme?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_codes: {
        Row: {
          created_at: string
          id: string
          influencer_code: string
          influencer_email: string
          influencer_id: string
          influencer_name: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_code: string
          influencer_email: string
          influencer_id: string
          influencer_name: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_code?: string
          influencer_email?: string
          influencer_id?: string
          influencer_name?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          iap_entitlements: Json | null
          iap_original_transaction_id: string | null
          iap_platform: string | null
          id: string
          influencer_code: string | null
          name: string | null
          premium_active: boolean | null
          premium_expires_at: string | null
          premium_source: string | null
          premium_trial_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          iap_entitlements?: Json | null
          iap_original_transaction_id?: string | null
          iap_platform?: string | null
          id?: string
          influencer_code?: string | null
          name?: string | null
          premium_active?: boolean | null
          premium_expires_at?: string | null
          premium_source?: string | null
          premium_trial_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          iap_entitlements?: Json | null
          iap_original_transaction_id?: string | null
          iap_platform?: string | null
          id?: string
          influencer_code?: string | null
          name?: string | null
          premium_active?: boolean | null
          premium_expires_at?: string | null
          premium_source?: string | null
          premium_trial_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_reasons: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          reason_code: Database["public"]["Enums"]["report_reason"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          reason_code: Database["public"]["Enums"]["report_reason"]
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          reason_code?: Database["public"]["Enums"]["report_reason"]
        }
        Relationships: []
      }
      sight_words: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          words: string[] | null
          words_objects: Json[] | null
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
          words?: string[] | null
          words_objects?: Json[] | null
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          words?: string[] | null
          words_objects?: Json[] | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          content: string
          created_at: string
          id: string
          reading_level: string
          theme: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reading_level: string
          theme: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reading_level?: string
          theme?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          created_at: string
          daily_stories_used: number
          id: string
          last_reset_date: string
          trial_started_at: string | null
          trial_used: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_stories_used?: number
          id?: string
          last_reset_date?: string
          trial_started_at?: string | null
          trial_used?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_stories_used?: number
          id?: string
          last_reset_date?: string
          trial_started_at?: string | null
          trial_used?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_user_limits: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          daily_stories_used: number
          id: string
          last_reset_date: string
          trial_started_at: string | null
          trial_used: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_limits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      report_reason:
        | "inappropriate_content"
        | "factual_errors"
        | "harmful_content"
        | "spam_content"
        | "copyright_violation"
        | "other"
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
      report_reason: [
        "inappropriate_content",
        "factual_errors",
        "harmful_content",
        "spam_content",
        "copyright_violation",
        "other",
      ],
    },
  },
} as const
