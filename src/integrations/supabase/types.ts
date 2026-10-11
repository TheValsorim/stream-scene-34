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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          channel_slug: string
          created_at: string
          display_name: string | null
          favorite_games: string[]
          id: string
          is_banned: boolean
          is_featured: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          channel_slug: string
          created_at?: string
          display_name?: string | null
          favorite_games?: string[]
          id: string
          is_banned?: boolean
          is_featured?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          channel_slug?: string
          created_at?: string
          display_name?: string | null
          favorite_games?: string[]
          id?: string
          is_banned?: boolean
          is_featured?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      streams: {
        Row: {
          camera_enabled: boolean
          created_at: string
          creator_id: string
          description: string | null
          device_type: string
          ended_at: string | null
          ended_reason: string | null
          id: string
          is_public: boolean
          last_heartbeat_at: string
          livekit_room_name: string
          microphone_enabled: boolean
          peak_viewers: number
          public_share_id: string
          public_watch_url: string | null
          started_at: string
          status: string
          stream_health: string
          stream_mode: string
          stream_provider: string
          thumbnail_url: string | null
          title: string
          viewer_count: number
        }
        Insert: {
          camera_enabled?: boolean
          created_at?: string
          creator_id: string
          description?: string | null
          device_type?: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          is_public?: boolean
          last_heartbeat_at?: string
          livekit_room_name: string
          microphone_enabled?: boolean
          peak_viewers?: number
          public_share_id: string
          public_watch_url?: string | null
          started_at?: string
          status?: string
          stream_health?: string
          stream_mode?: string
          stream_provider?: string
          thumbnail_url?: string | null
          title: string
          viewer_count?: number
        }
        Update: {
          camera_enabled?: boolean
          created_at?: string
          creator_id?: string
          description?: string | null
          device_type?: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          is_public?: boolean
          last_heartbeat_at?: string
          livekit_room_name?: string
          microphone_enabled?: boolean
          peak_viewers?: number
          public_share_id?: string
          public_watch_url?: string | null
          started_at?: string
          status?: string
          stream_health?: string
          stream_mode?: string
          stream_provider?: string
          thumbnail_url?: string | null
          title?: string
          viewer_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_end_stream: { Args: { _stream_id: string }; Returns: undefined }
      admin_list_streams: {
        Args: never
        Returns: {
          channel_slug: string
          creator_id: string
          device_type: string
          display_name: string
          ended_at: string
          ended_reason: string
          id: string
          last_heartbeat_at: string
          peak_viewers: number
          public_share_id: string
          started_at: string
          status: string
          stream_health: string
          stream_mode: string
          title: string
          viewer_count: number
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          channel_slug: string
          created_at: string
          display_name: string
          email: string
          favorite_games: string[]
          id: string
          is_admin: boolean
          is_banned: boolean
          is_featured: boolean
          last_sign_in_at: string
          max_viewers: number
          stream_count: number
          total_minutes: number
        }[]
      }
      admin_set_user_flags: {
        Args: { _is_banned: boolean; _is_featured: boolean; _user_id: string }
        Returns: undefined
      }
      admin_update_profile: {
        Args: { _channel_slug: string; _display_name: string; _user_id: string }
        Returns: undefined
      }
      get_profile_by_slug: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          bio: string
          channel_slug: string
          display_name: string
          favorite_games: string[]
          id: string
        }[]
      }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          channel_slug: string
          display_name: string
          favorite_games: string[]
          id: string
          is_featured: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      slugify_handle: { Args: { _input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
