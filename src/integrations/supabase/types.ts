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
      categories: {
        Row: {
          created_at: string
          description: string
          enable_general: boolean
          enable_link: boolean
          enable_notice: boolean
          enable_project: boolean
          enable_question: boolean
          eval_open: boolean
          eval_seed: number
          general_name: string
          github_required: boolean
          id: string
          link_name: string
          name: string
          password: string
          project_name: string
          slug: string
          sort_order: number
          tab_group: string
        }
        Insert: {
          created_at?: string
          description?: string
          enable_general?: boolean
          enable_link?: boolean
          enable_notice?: boolean
          enable_project?: boolean
          enable_question?: boolean
          eval_open?: boolean
          eval_seed?: number
          general_name?: string
          github_required?: boolean
          id?: string
          link_name?: string
          name: string
          password?: string
          project_name?: string
          slug: string
          sort_order?: number
          tab_group?: string
        }
        Update: {
          created_at?: string
          description?: string
          enable_general?: boolean
          enable_link?: boolean
          enable_notice?: boolean
          enable_project?: boolean
          enable_question?: boolean
          eval_open?: boolean
          eval_seed?: number
          general_name?: string
          github_required?: boolean
          id?: string
          link_name?: string
          name?: string
          password?: string
          project_name?: string
          slug?: string
          sort_order?: number
          tab_group?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author: string
          content: string
          created_at: string
          edit_password: string
          id: string
          image_urls: Json
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author?: string
          content?: string
          created_at?: string
          edit_password?: string
          id?: string
          image_urls?: Json
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          edit_password?: string
          id?: string
          image_urls?: Json
          parent_id?: string | null
          post_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          attachments: Json
          created_at: string
          date: string
          description: string
          id: string
          latitude: number | null
          links: Json
          location: string
          longitude: number | null
          place_address: string
          target: string
          time: string
          title: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          date: string
          description?: string
          id?: string
          latitude?: number | null
          links?: Json
          location?: string
          longitude?: number | null
          place_address?: string
          target?: string
          time?: string
          title: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          date?: string
          description?: string
          id?: string
          latitude?: number | null
          links?: Json
          location?: string
          longitude?: number | null
          place_address?: string
          target?: string
          time?: string
          title?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          caption: string
          created_at: string
          id: string
          image_url: string
          link_url: string
          sort_order: number
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          image_url: string
          link_url?: string
          sort_order?: number
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          image_url?: string
          link_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      posts: {
        Row: {
          author: string
          category_id: string
          content: string
          created_at: string
          deploy_url: string
          edit_password: string
          github_url: string
          id: string
          og_image_url: string
          post_no: number | null
          series: string
          title: string
          type: string
        }
        Insert: {
          author?: string
          category_id: string
          content?: string
          created_at?: string
          deploy_url?: string
          edit_password?: string
          github_url?: string
          id?: string
          og_image_url?: string
          post_no?: number | null
          series?: string
          title: string
          type: string
        }
        Update: {
          author?: string
          category_id?: string
          content?: string
          created_at?: string
          deploy_url?: string
          edit_password?: string
          github_url?: string
          id?: string
          og_image_url?: string
          post_no?: number | null
          series?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      review_criteria: {
        Row: {
          category_id: string
          created_at: string
          criterion_name: string
          id: string
          is_active: boolean
          max_score: number
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          criterion_name: string
          id?: string
          is_active?: boolean
          max_score?: number
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          criterion_name?: string
          id?: string
          is_active?: boolean
          max_score?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_criteria_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reviewer_name: string
          scores: Json
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reviewer_name?: string
          scores?: Json
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reviewer_name?: string
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reviews_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          award: string
          claimed_at: string | null
          created_at: string
          id: string
          level: number | null
          nickname_password: string
          updated_at: string
          username: string
          username_key: string
        }
        Insert: {
          award?: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          level?: number | null
          nickname_password?: string
          updated_at?: string
          username: string
          username_key: string
        }
        Update: {
          award?: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          level?: number | null
          nickname_password?: string
          updated_at?: string
          username?: string
          username_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
