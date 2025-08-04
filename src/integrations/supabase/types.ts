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
      content_images: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          section: string
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          section: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          section?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_testimonials: {
        Row: {
          created_at: string
          customer_initial: string
          customer_name: string
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          testimonial_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_initial: string
          customer_name: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          testimonial_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_initial?: string
          customer_name?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          testimonial_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      featured_operators: {
        Row: {
          completed_orders: number
          created_at: string
          display_order: number | null
          experience: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_verified: boolean | null
          name: string
          rating: number
          specialties: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_orders?: number
          created_at?: string
          display_order?: number | null
          experience: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          name: string
          rating?: number
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_orders?: number
          created_at?: string
          display_order?: number | null
          experience?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          name?: string
          rating?: number
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      homepage_content: {
        Row: {
          content_text: string
          content_type: string
          created_at: string
          id: string
          is_active: boolean | null
          section_key: string
          updated_at: string
        }
        Insert: {
          content_text: string
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_key: string
          updated_at?: string
        }
        Update: {
          content_text?: string
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      laundry_preferences: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
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
      notification_logs: {
        Row: {
          created_at: string
          customer_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: string | null
          notification_type: string
          order_id: string | null
          recipient: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          notification_type: string
          order_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          notification_type?: string
          order_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_deleted: boolean
          message: string
          status: string
          step_description: string | null
          subject: string
          trigger_step: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          message: string
          status: string
          step_description?: string | null
          subject: string
          trigger_step?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          message?: string
          status?: string
          step_description?: string | null
          subject?: string
          trigger_step?: number | null
          updated_at?: string
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
          dryer_inside_photo_url: string | null
          dryer_photo_url: string | null
          email: string
          experience: string | null
          first_name: string
          id: string
          last_name: string
          laundry_area_photo_url: string | null
          laundry_stack_photo_url: string | null
          motivation: string | null
          phone: string
          state: string
          status: string
          towel_photo_url: string | null
          tshirt_photo_url: string | null
          updated_at: string
          vehicle_type: string
          washer_inside_photo_url: string | null
          washer_photo_url: string | null
          zip_code: string
        }
        Insert: {
          address: string
          availability: string
          city: string
          created_at?: string
          drivers_license: string
          dryer_inside_photo_url?: string | null
          dryer_photo_url?: string | null
          email: string
          experience?: string | null
          first_name: string
          id?: string
          last_name: string
          laundry_area_photo_url?: string | null
          laundry_stack_photo_url?: string | null
          motivation?: string | null
          phone: string
          state: string
          status?: string
          towel_photo_url?: string | null
          tshirt_photo_url?: string | null
          updated_at?: string
          vehicle_type: string
          washer_inside_photo_url?: string | null
          washer_photo_url?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          availability?: string
          city?: string
          created_at?: string
          drivers_license?: string
          dryer_inside_photo_url?: string | null
          dryer_photo_url?: string | null
          email?: string
          experience?: string | null
          first_name?: string
          id?: string
          last_name?: string
          laundry_area_photo_url?: string | null
          laundry_stack_photo_url?: string | null
          motivation?: string | null
          phone?: string
          state?: string
          status?: string
          towel_photo_url?: string | null
          tshirt_photo_url?: string | null
          updated_at?: string
          vehicle_type?: string
          washer_inside_photo_url?: string | null
          washer_photo_url?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      operator_invites: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          is_used: boolean | null
          locker_access: string[] | null
          signup_expires_at: string
          signup_token: string
          updated_at: string
          used_by_user_id: string | null
          zip_codes: string[] | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          is_used?: boolean | null
          locker_access?: string[] | null
          signup_expires_at: string
          signup_token: string
          updated_at?: string
          used_by_user_id?: string | null
          zip_codes?: string[] | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          is_used?: boolean | null
          locker_access?: string[] | null
          signup_expires_at?: string
          signup_token?: string
          updated_at?: string
          used_by_user_id?: string | null
          zip_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_invites_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "operator_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string
          recipient_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id: string
          recipient_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string
          recipient_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ratings: {
        Row: {
          cleanliness_rating: number | null
          communication_rating: number | null
          created_at: string
          customer_id: string
          feedback: string | null
          folding_quality_rating: number | null
          id: string
          order_id: string
          overall_rating: number | null
        }
        Insert: {
          cleanliness_rating?: number | null
          communication_rating?: number | null
          created_at?: string
          customer_id: string
          feedback?: string | null
          folding_quality_rating?: number | null
          id?: string
          order_id: string
          overall_rating?: number | null
        }
        Update: {
          cleanliness_rating?: number | null
          communication_rating?: number | null
          created_at?: string
          customer_id?: string
          feedback?: string | null
          folding_quality_rating?: number | null
          id?: string
          order_id?: string
          overall_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bag_count: number | null
          business_cut_cents: number | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          customer_acknowledged: boolean | null
          customer_id: string
          delivery_address: string | null
          delivery_photo_url: string | null
          delivery_window_end: string | null
          delivery_window_start: string | null
          discount_amount_cents: number | null
          dry_temp_preference_id: string | null
          id: string
          is_express: boolean | null
          items: Json | null
          locker_id: string | null
          operator_payout_cents: number | null
          pickup_address: string | null
          pickup_photo_url: string | null
          pickup_type: Database["public"]["Enums"]["pickup_type"]
          pickup_window_end: string | null
          pickup_window_start: string | null
          promo_code: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          soap_preference_id: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          step_completed_at: Json | null
          step_photos: Json | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount_cents: number
          updated_at: string
          wash_temp_preference_id: string | null
          washer_id: string | null
          zip_code: string
        }
        Insert: {
          bag_count?: number | null
          business_cut_cents?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          customer_acknowledged?: boolean | null
          customer_id: string
          delivery_address?: string | null
          delivery_photo_url?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          discount_amount_cents?: number | null
          dry_temp_preference_id?: string | null
          id?: string
          is_express?: boolean | null
          items?: Json | null
          locker_id?: string | null
          operator_payout_cents?: number | null
          pickup_address?: string | null
          pickup_photo_url?: string | null
          pickup_type: Database["public"]["Enums"]["pickup_type"]
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          promo_code?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          soap_preference_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          step_completed_at?: Json | null
          step_photos?: Json | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount_cents: number
          updated_at?: string
          wash_temp_preference_id?: string | null
          washer_id?: string | null
          zip_code: string
        }
        Update: {
          bag_count?: number | null
          business_cut_cents?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          customer_acknowledged?: boolean | null
          customer_id?: string
          delivery_address?: string | null
          delivery_photo_url?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          discount_amount_cents?: number | null
          dry_temp_preference_id?: string | null
          id?: string
          is_express?: boolean | null
          items?: Json | null
          locker_id?: string | null
          operator_payout_cents?: number | null
          pickup_address?: string | null
          pickup_photo_url?: string | null
          pickup_type?: Database["public"]["Enums"]["pickup_type"]
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          promo_code?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          soap_preference_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          step_completed_at?: Json | null
          step_photos?: Json | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount_cents?: number
          updated_at?: string
          wash_temp_preference_id?: string | null
          washer_id?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_profiles_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_dry_temp_preference_id_fkey"
            columns: ["dry_temp_preference_id"]
            isOneToOne: false
            referencedRelation: "laundry_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_locker_id_fkey"
            columns: ["locker_id"]
            isOneToOne: false
            referencedRelation: "lockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_soap_preference_id_fkey"
            columns: ["soap_preference_id"]
            isOneToOne: false
            referencedRelation: "laundry_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_wash_temp_preference_id_fkey"
            columns: ["wash_temp_preference_id"]
            isOneToOne: false
            referencedRelation: "laundry_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_washer_id_washers_fkey"
            columns: ["washer_id"]
            isOneToOne: false
            referencedRelation: "washers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string
          id: string
          is_default: boolean | null
          stripe_payment_method_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
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
      promo_code_usage: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          image_url: string | null
          is_active: boolean
          one_time_use_per_user: boolean
          restricted_to_item_ids: string[] | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          one_time_use_per_user?: boolean
          restricted_to_item_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          one_time_use_per_user?: boolean
          restricted_to_item_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          reward_amount_cents: number
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          reward_amount_cents?: number
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          reward_amount_cents?: number
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
          reward_given_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
          reward_given_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code_id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_given_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id?: string
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
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_agent_id: string | null
          chat_transcript: Json | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          chat_transcript?: Json | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          chat_transcript?: Json | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount_cents: number
          created_at: string
          customer_id: string
          id: string
          message: string | null
          operator_id: string
          order_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          customer_id: string
          id?: string
          message?: string | null
          operator_id: string
          order_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          customer_id?: string
          id?: string
          message?: string | null
          operator_id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_metrics: {
        Row: {
          created_at: string
          description: string
          display_order: number | null
          icon_name: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          value?: string
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
      wallet_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          id: string
          operator_id: string | null
          order_id: string | null
          status: string
          stripe_session_id: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          id?: string
          operator_id?: string | null
          order_id?: string | null
          status?: string
          stripe_session_id?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          operator_id?: string | null
          order_id?: string | null
          status?: string
          stripe_session_id?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          id?: string
          updated_at?: string
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
      change_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["app_role"]
          reason?: string
        }
        Returns: boolean
      }
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
      validate_promo_code_usage: {
        Args: {
          code_to_check: string
          user_id_to_check: string
          order_total_cents: number
        }
        Returns: {
          is_valid: boolean
          discount_amount_cents: number
          error_message: string
        }[]
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
        | "picked_up"
        | "folded"
      pickup_type: "locker" | "pickup_delivery"
      service_type:
        | "wash_fold"
        | "wash_hang_dry"
        | "express"
        | "delicates_airdry"
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
        "picked_up",
        "folded",
      ],
      pickup_type: ["locker", "pickup_delivery"],
      service_type: [
        "wash_fold",
        "wash_hang_dry",
        "express",
        "delicates_airdry",
      ],
    },
  },
} as const
