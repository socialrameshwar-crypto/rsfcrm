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
      crm_companies: {
        Row: {
          address: string | null
          company_name: string
          contacts: Json
          country: string | null
          created_at: string
          gstin: string | null
          id: string
          notes: string | null
          state: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contacts?: Json
          country?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          notes?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contacts?: Json
          country?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          notes?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_followups: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          lead_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          lead_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          lead_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          company_name: string
          contact_person: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          last_followup_at: string | null
          notes: string | null
          phone: string | null
          product_id: string | null
          source: string
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          company_name: string
          contact_person?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          last_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          source?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          company_name?: string
          contact_person?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          last_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          source?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "crm_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_products"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_orders: {
        Row: {
          actual_dispatch: string | null
          created_at: string
          expected_dispatch: string | null
          id: string
          order_date: string
          order_no: string | null
          order_value: number
          production_status: Database["public"]["Enums"]["order_status"]
          quotation_id: string | null
          transport_details: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_dispatch?: string | null
          created_at?: string
          expected_dispatch?: string | null
          id?: string
          order_date?: string
          order_no?: string | null
          order_value?: number
          production_status?: Database["public"]["Enums"]["order_status"]
          quotation_id?: string | null
          transport_details?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          actual_dispatch?: string | null
          created_at?: string
          expected_dispatch?: string | null
          id?: string
          order_date?: string
          order_no?: string | null
          order_value?: number
          production_status?: Database["public"]["Enums"]["order_status"]
          quotation_id?: string | null
          transport_details?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "crm_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          domestic_price_inr: number
          export_price_usd: number
          gst_pct: number
          hsn_code: string | null
          id: string
          image_url: string | null
          name: string
          production_status: Database["public"]["Enums"]["product_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          domestic_price_inr?: number
          export_price_usd?: number
          gst_pct?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          name: string
          production_status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          domestic_price_inr?: number
          export_price_usd?: number
          gst_pct?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          name?: string
          production_status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_quotation_items: {
        Row: {
          capacity: string | null
          created_at: string
          id: string
          line_total: number
          moc: string | null
          motor: string | null
          product_id: string | null
          product_name: string
          qty: number
          quotation_id: string
          unit_price: number
        }
        Insert: {
          capacity?: string | null
          created_at?: string
          id?: string
          line_total?: number
          moc?: string | null
          motor?: string | null
          product_id?: string | null
          product_name: string
          qty?: number
          quotation_id: string
          unit_price?: number
        }
        Update: {
          capacity?: string | null
          created_at?: string
          id?: string
          line_total?: number
          moc?: string | null
          motor?: string | null
          product_id?: string | null
          product_name?: string
          qty?: number
          quotation_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "crm_quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "crm_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotations: {
        Row: {
          cgst: number
          company_id: string | null
          created_at: string
          currency: string
          grand_total: number
          id: string
          igst: number
          intro_note: string | null
          lead_id: string | null
          payment_terms: string | null
          quote_date: string
          quote_no: string | null
          sales_engineer_email: string | null
          sales_engineer_name: string | null
          sales_engineer_phone: string | null
          sgst: number
          status: Database["public"]["Enums"]["quote_status"]
          subject: string | null
          subtotal: number
          tax_mode: string
          terms_json: Json | null
          updated_at: string
          user_id: string
          validity_days: number
        }
        Insert: {
          cgst?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          grand_total?: number
          id?: string
          igst?: number
          intro_note?: string | null
          lead_id?: string | null
          payment_terms?: string | null
          quote_date?: string
          quote_no?: string | null
          sales_engineer_email?: string | null
          sales_engineer_name?: string | null
          sales_engineer_phone?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["quote_status"]
          subject?: string | null
          subtotal?: number
          tax_mode?: string
          terms_json?: Json | null
          updated_at?: string
          user_id?: string
          validity_days?: number
        }
        Update: {
          cgst?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          grand_total?: number
          id?: string
          igst?: number
          intro_note?: string | null
          lead_id?: string | null
          payment_terms?: string | null
          quote_date?: string
          quote_no?: string | null
          sales_engineer_email?: string | null
          sales_engineer_name?: string | null
          sales_engineer_phone?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["quote_status"]
          subject?: string | null
          subtotal?: number
          tax_mode?: string
          terms_json?: Json | null
          updated_at?: string
          user_id?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tours: {
        Row: {
          cities: string | null
          company_ids: string[]
          created_at: string
          end_date: string
          expense: number | null
          id: string
          notes: string | null
          sales_user_id: string | null
          sales_user_name: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cities?: string | null
          company_ids?: string[]
          created_at?: string
          end_date: string
          expense?: number | null
          id?: string
          notes?: string | null
          sales_user_id?: string | null
          sales_user_name?: string | null
          start_date: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          cities?: string | null
          company_ids?: string[]
          created_at?: string
          end_date?: string
          expense?: number | null
          id?: string
          notes?: string | null
          sales_user_id?: string | null
          sales_user_name?: string | null
          start_date?: string
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
          analysis: Json
          archived: boolean
          blocks: Json
          category: string
          created_at: string
          description: string | null
          field_overrides: Json
          id: string
          is_default: boolean
          mode: string
          name: string
          overlays: Json
          scope: string
          sections: Json
          source_pdf_pages: number | null
          source_pdf_url: string | null
          status: string
          tags: string[]
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ai_content?: Json
          analysis?: Json
          archived?: boolean
          blocks?: Json
          category?: string
          created_at?: string
          description?: string | null
          field_overrides?: Json
          id?: string
          is_default?: boolean
          mode?: string
          name: string
          overlays?: Json
          scope?: string
          sections?: Json
          source_pdf_pages?: number | null
          source_pdf_url?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ai_content?: Json
          analysis?: Json
          archived?: boolean
          blocks?: Json
          category?: string
          created_at?: string
          description?: string | null
          field_overrides?: Json
          id?: string
          is_default?: boolean
          mode?: string
          name?: string
          overlays?: Json
          scope?: string
          sections?: Json
          source_pdf_pages?: number | null
          source_pdf_url?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          version?: number
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
          generated_pdf_path: string | null
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
          generated_pdf_path?: string | null
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
          generated_pdf_path?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      crm_product_stats: {
        Row: {
          product_id: string | null
          quotation_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      seed_rsf_demo_data: { Args: { _uid: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "sales"
      lead_stage:
        | "New"
        | "Contacted"
        | "Quotation Sent"
        | "Negotiation"
        | "Won"
        | "Lost"
      order_status:
        | "Pending"
        | "In Production"
        | "Quality Check"
        | "Dispatched"
        | "Delivered"
      product_status: "In Stock" | "Made to Order"
      quote_status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired"
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
      app_role: ["admin", "sales"],
      lead_stage: [
        "New",
        "Contacted",
        "Quotation Sent",
        "Negotiation",
        "Won",
        "Lost",
      ],
      order_status: [
        "Pending",
        "In Production",
        "Quality Check",
        "Dispatched",
        "Delivered",
      ],
      product_status: ["In Stock", "Made to Order"],
      quote_status: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
    },
  },
} as const
