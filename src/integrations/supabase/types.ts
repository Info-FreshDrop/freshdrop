export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      clothes_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      lockers: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean | null
          locker_count: number | null
          name: string
          qr_code: string | null
          status: Database["public"]["Enums"]["locker_status"] | null
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          locker_count?: number | null
          name: string
          qr_code?: string | null
          status?: Database["public"]["Enums"]["locker_status"] | null
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          locker_count?: number | null
          name?: string
          qr_code?: string | null
          status?: Database["public"]["Enums"]["locker_status"] | null
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      operator_applications: {
        Row: {
          address: string
          availability: string
          city: string
          created_at: string
          drivers_license: string
          email: string
          experience: string | null
          first_name: string
          id: string
          last_name: string
          motivation: string | null
          phone: string
          state: string
          status: string
          updated_at: string
          vehicle_type: string
          zip_code: string
        }
        Insert: {
          address: string
          availability: string
          city: string
          created_at?: string
          drivers_license: string
          email: string
          experience?: string | null
          first_name: string
          id?: string
          last_name: string
          motivation?: string | null
          phone: string
          state: string
          status?: string
          updated_at?: string
          vehicle_type: string
          zip_code: string
        }
        Update: {
          address?: string
          availability?: string
          city?: string
          created_at?: string
          drivers_license?: string
          email?: string
          experience?: string | null
          first_name?: string
          id?: string
          last_name?: string
          motivation?: string | null
          phone?: string
          state?: string
          status?: string
          updated_at?: string
          vehicle_type?: string
          zip_code?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          bag_count: number | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_photo_url: string | null
          delivery_window_end: string | null
          delivery_window_start: string | null
          discount_amount_cents: number | null
          id: string
          is_express: boolean | null
          items: Json | null
          locker_id: string | null
          pickup_address: string | null
          pickup_photo_url: string | null
          pickup_type: Database["public"]["Enums"]["pickup_type"]
          pickup_window_end: string | null
          pickup_window_start: string | null
          promo_code: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount_cents: number
          updated_at: string
          washer_id: string | null
          zip_code: string
        }
        Insert: {
          bag_count?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_photo_url?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          discount_amount_cents?: number | null
          id?: string
          is_express?: boolean | null
          items?: Json | null
          locker_id?: string | null
          pickup_address?: string | null
          pickup_photo_url?: string | null
          pickup_type: Database["public"]["Enums"]["pickup_type"]
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          promo_code?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount_cents: number
          updated_at?: string
          washer_id?: string | null
          zip_code: string
        }
        Update: {
          bag_count?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_photo_url?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          discount_amount_cents?: number | null
          id?: string
          is_express?: boolean | null
          items?: Json | null
          locker_id?: string | null
          pickup_address?: string | null
          pickup_photo_url?: string | null
          pickup_type?: Database["public"]["Enums"]["pickup_type"]
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          promo_code?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount_cents?: number
          updated_at?: string
          washer_id?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_locker_id_fkey"
            columns: ["locker_id"]
            isOneToOne: false
            referencedRelation: "lockers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      service_areas: {
        Row: {
          allows_delivery: boolean | null
          allows_express: boolean | null
          allows_locker: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          zip_code: string
        }
        Insert: {
          allows_delivery?: boolean | null
          allows_express?: boolean | null
          allows_locker?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          zip_code: string
        }
        Update: {
          allows_delivery?: boolean | null
          allows_express?: boolean | null
          allows_locker?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          zip_code?: string
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
      washers: {
        Row: {
          approval_status: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_online: boolean | null
          locker_access: string[] | null
          signup_expires_at: string | null
          signup_token: string | null
          updated_at: string
          user_id: string
          zip_codes: string[] | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          locker_access?: string[] | null
          signup_expires_at?: string | null
          signup_token?: string | null
          updated_at?: string
          user_id: string
          zip_codes?: string[] | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          locker_access?: string[] | null
          signup_expires_at?: string | null
          signup_token?: string | null
          updated_at?: string
          user_id?: string
          zip_codes?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          user_uuid: string
          check_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin_role: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "washer" | "operator" | "owner" | "marketing"
      locker_status: "available" | "in_use" | "full" | "maintenance" | "closed"
      order_status:
        | "placed"
        | "unclaimed"
        | "claimed"
        | "in_progress"
        | "washed"
        | "returned"
        | "completed"
        | "cancelled"
      pickup_type: "locker" | "pickup_delivery"
      service_type: "wash_fold" | "wash_hang_dry" | "express"
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
      app_role: ["customer", "washer", "operator", "owner", "marketing"],
      locker_status: ["available", "in_use", "full", "maintenance", "closed"],
      order_status: [
        "placed",
        "unclaimed",
        "claimed",
        "in_progress",
        "washed",
        "returned",
        "completed",
        "cancelled",
      ],
      pickup_type: ["locker", "pickup_delivery"],
      service_type: ["wash_fold", "wash_hang_dry", "express"],
    },
  },
} as const
