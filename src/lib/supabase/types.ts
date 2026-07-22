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
      menu_categories: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          id: string
          is_required: boolean | null
          item_id: string
          max_select: number | null
          name: string
        }
        Insert: {
          id?: string
          is_required?: boolean | null
          item_id: string
          max_select?: number | null
          name: string
        }
        Update: {
          id?: string
          is_required?: boolean | null
          item_id?: string
          max_select?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          group_id: string
          id: string
          name: string
          price_delta: number | null
        }
        Insert: {
          group_id: string
          id?: string
          name: string
          price_delta?: number | null
        }
        Update: {
          group_id?: string
          id?: string
          name?: string
          price_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_counters: {
        Row: {
          last_number: number
          restaurant_id: string
        }
        Insert: {
          last_number?: number
          restaurant_id: string
        }
        Update: {
          last_number?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_counters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string | null
          name_snapshot: string
          notes: string | null
          options_snapshot: Json | null
          order_id: string
          price_snapshot: number
          quantity: number
        }
        Insert: {
          id?: string
          menu_item_id?: string | null
          name_snapshot: string
          notes?: string | null
          options_snapshot?: Json | null
          order_id: string
          price_snapshot: number
          quantity?: number
        }
        Update: {
          id?: string
          menu_item_id?: string | null
          name_snapshot?: string
          notes?: string | null
          options_snapshot?: Json | null
          order_id?: string
          price_snapshot?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_collected: number | null
          client_request_id: string | null
          created_at: string | null
          customer_landmark: string | null
          customer_lat: number | null
          customer_lng: number | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          delivery_notes: string | null
          driver_id: string | null
          id: string
          order_number: number
          payment_method: string | null
          payment_status: string | null
          restaurant_id: string
          status: string
          subtotal: number
          table_id: string | null
          total: number
          type: string
          updated_at: string | null
        }
        Insert: {
          cash_collected?: number | null
          client_request_id?: string | null
          created_at?: string | null
          customer_landmark?: string | null
          customer_lat?: number | null
          customer_lng?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          driver_id?: string | null
          id?: string
          order_number: number
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id: string
          status?: string
          subtotal?: number
          table_id?: string | null
          total?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          cash_collected?: number | null
          client_request_id?: string | null
          created_at?: string | null
          customer_landmark?: string | null
          customer_lat?: number | null
          customer_lng?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          driver_id?: string | null
          id?: string
          order_number?: number
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          total?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          driver_status: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          restaurant_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          driver_status?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          restaurant_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          driver_status?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          restaurant_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          area: string | null
          created_at: string | null
          currency: string | null
          delivery_enabled: boolean
          delivery_fee: number | null
          id: string
          is_active: boolean | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          min_order: number
          name: string
          phone: string | null
          pickup_enabled: boolean
          settings: Json | null
          slug: string
        }
        Insert: {
          area?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_enabled?: boolean
          delivery_fee?: number | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          min_order?: number
          name: string
          phone?: string | null
          pickup_enabled?: boolean
          settings?: Json | null
          slug: string
        }
        Update: {
          area?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_enabled?: boolean
          delivery_fee?: number | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          min_order?: number
          name?: string
          phone?: string | null
          pickup_enabled?: boolean
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          end_date: string | null
          id: string
          restaurant_id: string
          start_date: string | null
          status: string
          tier: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          restaurant_id: string
          start_date?: string | null
          status?: string
          tier: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          restaurant_id?: string
          start_date?: string | null
          status?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          qr_token: string
          restaurant_id: string
          table_number: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          qr_token: string
          restaurant_id: string
          table_number: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          qr_token?: string
          restaurant_id?: string
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_calls: {
        Row: {
          acknowledged: boolean
          created_at: string
          id: string
          restaurant_id: string
          table_id: string
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          restaurant_id: string
          table_id: string
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          restaurant_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_restaurant_with_owner: {
        Args: {
          p_area?: string
          p_full_name?: string
          p_name: string
          p_phone?: string
          p_slug: string
        }
        Returns: string
      }
      current_restaurant_id: { Args: never; Returns: string }
      driver_cash_today: {
        Args: never
        Returns: {
          cash_total: number
          delivered_count: number
          driver_id: string
          driver_name: string
        }[]
      }
      get_menu_by_qr_token: { Args: { p_token: string }; Returns: Json }
      get_menu_by_slug: { Args: { p_slug: string }; Returns: Json }
      get_order_status: { Args: { p_order_id: string }; Returns: Json }
      is_restaurant_staff: { Args: never; Returns: boolean }
      menu_payload: { Args: { p_restaurant: string }; Returns: Json }
      next_order_number: { Args: { rid: string }; Returns: number }
      restaurant_hourly: {
        Args: { from_ts: string; rid: string; to_ts: string }
        Returns: {
          hour: number
          order_count: number
          revenue: number
        }[]
      }
      restaurant_sales_by_type: {
        Args: { from_ts: string; rid: string; to_ts: string }
        Returns: {
          order_count: number
          revenue: number
          type: string
        }[]
      }
      restaurant_sales_summary: {
        Args: { from_ts: string; rid: string; to_ts: string }
        Returns: {
          avg_order: number
          cash_collected: number
          order_count: number
          revenue: number
        }[]
      }
      restaurant_top_items: {
        Args: { from_ts: string; lim?: number; rid: string; to_ts: string }
        Returns: {
          name: string
          quantity: number
          revenue: number
        }[]
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
