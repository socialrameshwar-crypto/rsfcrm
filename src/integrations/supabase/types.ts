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
      content_blocks: {
        Row: {
          archived: boolean
          body: string
          category: string
          created_at: string
          id: string
          name: string
          product_slug: string | null
          sort_order: number
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          body?: string
          category?: string
          created_at?: string
          id?: string
          name: string
          product_slug?: string | null
          sort_order?: number
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          body?: string
          category?: string
          created_at?: string
          id?: string
          name?: string
          product_slug?: string | null
          sort_order?: number
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          company_name: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          customer_name: string
          email: string | null
          gst_vat: string | null
          id: string
          industry: string | null
          mobile: string | null
          notes: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          customer_name: string
          email?: string | null
          gst_vat?: string | null
          id?: string
          industry?: string | null
          mobile?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          customer_name?: string
          email?: string | null
          gst_vat?: string | null
          id?: string
          industry?: string | null
          mobile?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      machine_selection_rules: {
        Row: {
          archived: boolean
          automation: string | null
          capacity: string | null
          created_at: string
          id: string
          items: Json
          material: string | null
          name: string
          notes: string | null
          priority: number
          product_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          automation?: string | null
          capacity?: string | null
          created_at?: string
          id?: string
          items?: Json
          material?: string | null
          name: string
          notes?: string | null
          priority?: number
          product_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          automation?: string | null
          capacity?: string | null
          created_at?: string
          id?: string
          items?: Json
          material?: string | null
          name?: string
          notes?: string | null
          priority?: number
          product_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      machines: {
        Row: {
          applications: string[]
          archived: boolean
          base_price: number
          capacity: string | null
          category_id: string | null
          code: string | null
          commissioning_pct: number
          created_at: string
          currency: string
          customer_price: number
          dealer_price: number
          description: string | null
          dimensions: string | null
          discount_pct: number
          export_price: number
          features: string[]
          freight_pct: number
          id: string
          image_url: string | null
          install_pct: number
          material: string | null
          motor: string | null
          name: string
          optional_accessories: Json
          packing_pct: number
          power_kw: number | null
          sort_order: number
          std_accessories: string[]
          tax_pct: number
          updated_at: string
          user_id: string
          warranty: string | null
          weight: string | null
        }
        Insert: {
          applications?: string[]
          archived?: boolean
          base_price?: number
          capacity?: string | null
          category_id?: string | null
          code?: string | null
          commissioning_pct?: number
          created_at?: string
          currency?: string
          customer_price?: number
          dealer_price?: number
          description?: string | null
          dimensions?: string | null
          discount_pct?: number
          export_price?: number
          features?: string[]
          freight_pct?: number
          id?: string
          image_url?: string | null
          install_pct?: number
          material?: string | null
          motor?: string | null
          name: string
          optional_accessories?: Json
          packing_pct?: number
          power_kw?: number | null
          sort_order?: number
          std_accessories?: string[]
          tax_pct?: number
          updated_at?: string
          user_id: string
          warranty?: string | null
          weight?: string | null
        }
        Update: {
          applications?: string[]
          archived?: boolean
          base_price?: number
          capacity?: string | null
          category_id?: string | null
          code?: string | null
          commissioning_pct?: number
          created_at?: string
          currency?: string
          customer_price?: number
          dealer_price?: number
          description?: string | null
          dimensions?: string | null
          discount_pct?: number
          export_price?: number
          features?: string[]
          freight_pct?: number
          id?: string
          image_url?: string | null
          install_pct?: number
          material?: string | null
          motor?: string | null
          name?: string
          optional_accessories?: Json
          packing_pct?: number
          power_kw?: number | null
          sort_order?: number
          std_accessories?: string[]
          tax_pct?: number
          updated_at?: string
          user_id?: string
          warranty?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          name: string
          slug: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          name: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_templates: {
        Row: {
          ai_content: Json
          archived: boolean
          blocks: Json
          category: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          mode: string
          name: string
          overlays: Json
          scope: string
          sections: Json
          source_pdf_pages: number | null
          source_pdf_url: string | null
          tags: string[]
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_content?: Json
          archived?: boolean
          blocks?: Json
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          mode?: string
          name: string
          overlays?: Json
          scope?: string
          sections?: Json
          source_pdf_pages?: number | null
          source_pdf_url?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_content?: Json
          archived?: boolean
          blocks?: Json
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          mode?: string
          name?: string
          overlays?: Json
          scope?: string
          sections?: Json
          source_pdf_pages?: number | null
          source_pdf_url?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          ai_content: Json
          automation: string
          blocks: Json | null
          capacity: string
          commercials: Json
          created_at: string
          currency: string
          customer_id: string | null
          follow_up_date: string | null
          id: string
          machines: Json
          material: string
          overlay_values: Json
          product_type: string
          proposal_number: string
          quotation_type: string
          sales_engineer: string | null
          status: string
          template: string
          template_id: string | null
          terms_template_id: string | null
          title: string
          total_value: number
          updated_at: string
          user_id: string
          utilities: Json
        }
        Insert: {
          ai_content?: Json
          automation: string
          blocks?: Json | null
          capacity: string
          commercials?: Json
          created_at?: string
          currency?: string
          customer_id?: string | null
          follow_up_date?: string | null
          id?: string
          machines?: Json
          material: string
          overlay_values?: Json
          product_type: string
          proposal_number: string
          quotation_type?: string
          sales_engineer?: string | null
          status?: string
          template?: string
          template_id?: string | null
          terms_template_id?: string | null
          title: string
          total_value?: number
          updated_at?: string
          user_id: string
          utilities?: Json
        }
        Update: {
          ai_content?: Json
          automation?: string
          blocks?: Json | null
          capacity?: string
          commercials?: Json
          created_at?: string
          currency?: string
          customer_id?: string | null
          follow_up_date?: string | null
          id?: string
          machines?: Json
          material?: string
          overlay_values?: Json
          product_type?: string
          proposal_number?: string
          quotation_type?: string
          sales_engineer?: string | null
          status?: string
          template?: string
          template_id?: string | null
          terms_template_id?: string | null
          title?: string
          total_value?: number
          updated_at?: string
          user_id?: string
          utilities?: Json
        }
        Relationships: [
          {
            foreignKeyName: "proposals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_clauses: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          id: string
          position: number
          template_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          template_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          template_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_clauses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "terms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          scope: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          scope?: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          scope?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      utility_formulas: {
        Row: {
          archived: boolean
          created_at: string
          expression: string
          id: string
          key: string
          label: string
          product_slug: string | null
          sort_order: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          expression: string
          id?: string
          key: string
          label: string
          product_slug?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          expression?: string
          id?: string
          key?: string
          label?: string
          product_slug?: string | null
          sort_order?: number
          unit?: string | null
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
