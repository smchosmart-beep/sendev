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
      award_icon_rules: {
        Row: {
          created_at: string
          icon: string
          id: string
          keyword: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          keyword: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          keyword?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string
          enable_general: boolean
          enable_link: boolean
          enable_notice: boolean
          enable_post: boolean
          enable_problem: boolean
          enable_project: boolean
          enable_question: boolean
          enable_record: boolean
          enable_vote: boolean
          eval_open: boolean
          eval_seed: number
          general_name: string
          github_required: boolean
          hidden: boolean
          id: string
          is_group: boolean
          link_name: string
          name: string
          parent_id: string | null
          password: string
          problem_name: string
          project_name: string
          record_name: string
          review_allowlist_only: boolean
          slug: string
          sort_order: number
          tab_group: string
          template_post: string
          template_question: string
          template_vote: string
          vote_max_choices: number
          vote_name: string
          vote_status: string
        }
        Insert: {
          created_at?: string
          description?: string
          enable_general?: boolean
          enable_link?: boolean
          enable_notice?: boolean
          enable_post?: boolean
          enable_problem?: boolean
          enable_project?: boolean
          enable_question?: boolean
          enable_record?: boolean
          enable_vote?: boolean
          eval_open?: boolean
          eval_seed?: number
          general_name?: string
          github_required?: boolean
          hidden?: boolean
          id?: string
          is_group?: boolean
          link_name?: string
          name: string
          parent_id?: string | null
          password?: string
          problem_name?: string
          project_name?: string
          record_name?: string
          review_allowlist_only?: boolean
          slug: string
          sort_order?: number
          tab_group?: string
          template_post?: string
          template_question?: string
          template_vote?: string
          vote_max_choices?: number
          vote_name?: string
          vote_status?: string
        }
        Update: {
          created_at?: string
          description?: string
          enable_general?: boolean
          enable_link?: boolean
          enable_notice?: boolean
          enable_post?: boolean
          enable_problem?: boolean
          enable_project?: boolean
          enable_question?: boolean
          enable_record?: boolean
          enable_vote?: boolean
          eval_open?: boolean
          eval_seed?: number
          general_name?: string
          github_required?: boolean
          hidden?: boolean
          id?: string
          is_group?: boolean
          link_name?: string
          name?: string
          parent_id?: string | null
          password?: string
          problem_name?: string
          project_name?: string
          record_name?: string
          review_allowlist_only?: boolean
          slug?: string
          sort_order?: number
          tab_group?: string
          template_post?: string
          template_question?: string
          template_vote?: string
          vote_max_choices?: number
          vote_name?: string
          vote_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      hackathon_reviews: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          nickname: string
          participant_type: string
          updated_at: string
        }
        Insert: {
          color?: string
          content: string
          created_at?: string
          id?: string
          nickname: string
          participant_type: string
          updated_at?: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          nickname?: string
          participant_type?: string
          updated_at?: string
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
      post_likes: {
        Row: {
          created_at: string
          id: string
          liker_key: string
          liker_name: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          liker_key: string
          liker_name?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          liker_key?: string
          liker_name?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      post_reads: {
        Row: {
          created_at: string
          id: string
          post_id: string
          username_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          username_key: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          username_key?: string
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
          parent_post_id: string | null
          pinned: boolean
          post_no: number | null
          problem_area: string
          problem_frequency: string
          series: string
          title: string
          type: string
          view_count: number
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
          parent_post_id?: string | null
          pinned?: boolean
          post_no?: number | null
          problem_area?: string
          problem_frequency?: string
          series?: string
          title: string
          type: string
          view_count?: number
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
          parent_post_id?: string | null
          pinned?: boolean
          post_no?: number | null
          problem_area?: string
          problem_frequency?: string
          series?: string
          title?: string
          type?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      record_final: {
        Row: {
          change_content: string
          change_type: string
          consent: string
          created_at: string
          current_scope: string
          demo_video_url: string
          deploy_status: string
          deploy_url: string
          dir_structure: string
          env_names: string
          github_url: string
          hero_image_url: string
          install_cmd: string
          license_code: string
          license_docs: string
          license_external: string
          one_liner: string
          output_type: string
          post_id: string
          privacy_status: string
          problem: string
          problem_area: string
          risk_expected: string
          risk_mitigation: string
          risk_stop: string
          risk_test: string
          run_cmd: string
          service_name: string
          solution: string
          tags: string
          target_user: string
          tech_ai: string
          tech_deploy: string
          tech_screen: string
          tech_server: string
          tech_stack: string
          tech_storage: string
          updated_at: string
          updated_by: string
          usage_condition: string
          usage_env: string
        }
        Insert: {
          change_content?: string
          change_type?: string
          consent?: string
          created_at?: string
          current_scope?: string
          demo_video_url?: string
          deploy_status?: string
          deploy_url?: string
          dir_structure?: string
          env_names?: string
          github_url?: string
          hero_image_url?: string
          install_cmd?: string
          license_code?: string
          license_docs?: string
          license_external?: string
          one_liner?: string
          output_type?: string
          post_id: string
          privacy_status?: string
          problem?: string
          problem_area?: string
          risk_expected?: string
          risk_mitigation?: string
          risk_stop?: string
          risk_test?: string
          run_cmd?: string
          service_name?: string
          solution?: string
          tags?: string
          target_user?: string
          tech_ai?: string
          tech_deploy?: string
          tech_screen?: string
          tech_server?: string
          tech_stack?: string
          tech_storage?: string
          updated_at?: string
          updated_by?: string
          usage_condition?: string
          usage_env?: string
        }
        Update: {
          change_content?: string
          change_type?: string
          consent?: string
          created_at?: string
          current_scope?: string
          demo_video_url?: string
          deploy_status?: string
          deploy_url?: string
          dir_structure?: string
          env_names?: string
          github_url?: string
          hero_image_url?: string
          install_cmd?: string
          license_code?: string
          license_docs?: string
          license_external?: string
          one_liner?: string
          output_type?: string
          post_id?: string
          privacy_status?: string
          problem?: string
          problem_area?: string
          risk_expected?: string
          risk_mitigation?: string
          risk_stop?: string
          risk_test?: string
          run_cmd?: string
          service_name?: string
          solution?: string
          tags?: string
          target_user?: string
          tech_ai?: string
          tech_deploy?: string
          tech_screen?: string
          tech_server?: string
          tech_stack?: string
          tech_storage?: string
          updated_at?: string
          updated_by?: string
          usage_condition?: string
          usage_env?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_final_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      record_members: {
        Row: {
          affiliation: string
          category_id: string
          created_at: string
          id: string
          post_id: string
          role: string
          username: string
          username_key: string
        }
        Insert: {
          affiliation?: string
          category_id: string
          created_at?: string
          id?: string
          post_id: string
          role?: string
          username: string
          username_key: string
        }
        Update: {
          affiliation?: string
          category_id?: string
          created_at?: string
          id?: string
          post_id?: string
          role?: string
          username?: string
          username_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_members_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_members_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      record_reflections: {
        Row: {
          affiliation: string
          content: string
          created_at: string
          id: string
          post_id: string
          promise: string
          promise_detail: string
          promises: string[]
          q1: string
          q2: string
          role: string
          spread_plan: string
          updated_at: string
          updated_by: string
          username: string
          username_key: string
        }
        Insert: {
          affiliation?: string
          content?: string
          created_at?: string
          id?: string
          post_id: string
          promise?: string
          promise_detail?: string
          promises?: string[]
          q1?: string
          q2?: string
          role?: string
          spread_plan?: string
          updated_at?: string
          updated_by?: string
          username: string
          username_key: string
        }
        Update: {
          affiliation?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          promise?: string
          promise_detail?: string
          promises?: string[]
          q1?: string
          q2?: string
          role?: string
          spread_plan?: string
          updated_at?: string
          updated_by?: string
          username?: string
          username_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_reflections_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      record_rows: {
        Row: {
          author: string
          col1: string
          col2: string
          col3: string
          col4: string
          col5: string
          col6: string
          created_at: string
          id: string
          kind: string
          post_id: string
          sort_order: number
          subtype: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          author?: string
          col1?: string
          col2?: string
          col3?: string
          col4?: string
          col5?: string
          col6?: string
          created_at?: string
          id?: string
          kind: string
          post_id: string
          sort_order?: number
          subtype?: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          author?: string
          col1?: string
          col2?: string
          col3?: string
          col4?: string
          col5?: string
          col6?: string
          created_at?: string
          id?: string
          kind?: string
          post_id?: string
          sort_order?: number
          subtype?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_rows_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      review_allowlist: {
        Row: {
          category_id: string
          created_at: string
          id: string
          reviewer_key: string
          reviewer_name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          reviewer_key: string
          reviewer_name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          reviewer_key?: string
          reviewer_name?: string
        }
        Relationships: []
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
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_awards: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          username: string
          username_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          username: string
          username_key: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          username?: string
          username_key?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          award: string
          claimed_at: string | null
          created_at: string
          id: string
          level: number | null
          nickname_password: string
          recovery_answer: string
          recovery_question: string
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
          recovery_answer?: string
          recovery_question?: string
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
          recovery_answer?: string
          recovery_question?: string
          updated_at?: string
          username?: string
          username_key?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          category_id: string
          created_at: string
          id: string
          post_id: string
          voter_key: string
          voter_name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          post_id: string
          voter_key: string
          voter_name?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          post_id?: string
          voter_key?: string
          voter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_post_chain: {
        Args: { p_post_id: string }
        Returns: {
          author: string
          category_id: string
          created_at: string
          id: string
          parent_post_id: string
          post_no: number
          title: string
        }[]
      }
      increment_post_view: { Args: { p_id: string }; Returns: undefined }
      move_post_chain: {
        Args: { p_post_id: string; p_target_category: string }
        Returns: number
      }
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
