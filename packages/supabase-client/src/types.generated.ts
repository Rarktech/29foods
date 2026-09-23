// Hand-authored to match supabase/migrations/20260920000000_init_schema.sql.
// Replace with the real output of `supabase gen types typescript --linked` once
// the project is linked (Setup checklist, step 1) — keep the shape in sync until then.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface NotificationPrefs {
  riderMsg: boolean;
  delivered: boolean;
  flash: boolean;
  menuDrop: boolean;
  planRenew: boolean;
  planTomorrow: boolean;
  cartNudge: boolean;
  winback: boolean;
  points: boolean;
  referral: boolean;
  push: boolean;
  sms: boolean;
  quiet: boolean;
  quietFrom: string;
  quietTo: string;
}

export interface Database {
  public: {
    Tables: {
      admin_profiles: {
        Row: { id: string; role: "owner" | "admin"; name: string | null; created_at: string };
        Insert: { id: string; role: "owner" | "admin"; name?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["admin_profiles"]["Insert"]>;
        Relationships: [];
      };
      qr_codes: {
        Row: {
          qr_code: string; lodge_name: string; zone: string | null; lat: number | null; lng: number | null;
          stickers_placed: number; date_placed: string; created_at: string;
        };
        Insert: {
          qr_code: string; lodge_name: string; zone?: string | null; lat?: number | null; lng?: number | null;
          stickers_placed?: number; date_placed?: string; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["qr_codes"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string; auth_uid: string | null; telegram_id: number | null; phone: string | null;
          email: string | null; name: string | null; avatar_url: string | null;
          lodge: string | null; room: string | null; acquired_via_qr: string | null;
          favourites: Json; loyalty_points: number; last_order_at: string | null; created_at: string;
          notification_prefs: NotificationPrefs;
        };
        Insert: {
          id?: string; auth_uid?: string | null; telegram_id?: number | null; phone?: string | null;
          email?: string | null; name?: string | null; avatar_url?: string | null;
          lodge?: string | null; room?: string | null; acquired_via_qr?: string | null;
          favourites?: Json; loyalty_points?: number; last_order_at?: string | null; created_at?: string;
          notification_prefs?: NotificationPrefs;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_acquired_via_qr_fkey";
            columns: ["acquired_via_qr"];
            isOneToOne: false;
            referencedRelation: "qr_codes";
            referencedColumns: ["qr_code"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string; name: string; category: "rice" | "protein" | "drink" | "snack" | "swallow"; price: number;
          is_available: boolean; image_url: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; category: "rice" | "protein" | "drink" | "snack" | "swallow"; price: number;
          is_available?: boolean; image_url?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [];
      };
      inventory: {
        Row: { menu_item_id: string; stock_count: number; low_stock_threshold: number; updated_at: string };
        Insert: { menu_item_id: string; stock_count?: number; low_stock_threshold?: number; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["inventory"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "inventory_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: true;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      riders: {
        Row: {
          id: string; name: string; telegram_id: number | null; phone: string | null;
          cycle_status: "at_base" | "heading_back" | "out_delivering" | "offline";
          assigned_bike: string | null; last_location: Json | null; created_at: string;
        };
        Insert: {
          id?: string; name: string; telegram_id?: number | null; phone?: string | null;
          cycle_status?: "at_base" | "heading_back" | "out_delivering" | "offline";
          assigned_bike?: string | null; last_location?: Json | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["riders"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string; user_id: string; items: Json; subtotal: number; delivery_fee: number; total: number;
          lodge: string; room: string | null;
          payment_status: "pending" | "paid" | "failed" | "refunded";
          order_status: "placed" | "paid" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
          assigned_rider_id: string | null; source_qr: string | null; channel: "web" | "telegram";
          flutterwave_tx_ref: string | null; flutterwave_tx_id: string | null; expires_at: string | null;
          subscription_id: string | null;
          created_at: string; paid_at: string | null; delivered_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          user_id: string; items: Json; subtotal: number; total: number; lodge: string; channel: "web" | "telegram";
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_assigned_rider_id_fkey";
            columns: ["assigned_rider_id"];
            isOneToOne: false;
            referencedRelation: "riders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_events: {
        Row: {
          id: string; order_id: string; actor_type: "rider" | "admin" | "system" | "customer";
          actor_id: string | null; from_status: string | null; to_status: string; client_op_id: string | null;
          applied: boolean; attempts: number; last_error: string | null; created_at: string; applied_at: string | null;
        };
        Insert: {
          id?: string; order_id: string; actor_type: "rider" | "admin" | "system" | "customer";
          actor_id?: string | null; from_status?: string | null; to_status: string; client_op_id?: string | null;
          applied?: boolean; attempts?: number; last_error?: string | null; created_at?: string; applied_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_status_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          id: string; order_id: string; user_id: string; reaction: "fire" | "neutral" | "down";
          comment: string | null; created_at: string;
          reason: string | null; status: "new" | "under_review" | "resolved"; resolution: string | null;
          resolved_at: string | null; resolved_by: string | null;
        };
        Insert: {
          id?: string; order_id: string; user_id: string; reaction: "fire" | "neutral" | "down";
          comment?: string | null; created_at?: string;
          reason?: string | null; status?: "new" | "under_review" | "resolved"; resolution?: string | null;
          resolved_at?: string | null; resolved_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "feedback_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_locations: {
        Row: {
          id: string; user_id: string; label: "home" | "work" | "friend" | "other";
          lodge: string; room: string | null; note: string | null; is_default: boolean; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; label?: "home" | "work" | "friend" | "other";
          lodge: string; room?: string | null; note?: string | null; is_default?: boolean; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_locations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "saved_locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      broadcasts: {
        Row: {
          id: string; message: string; target: "all" | "lodge" | "zone" | "inactive_users" | "meal_plan_subscribers";
          target_value: string | null; sent_at: string | null; sent_count: number;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; message: string; target: "all" | "lodge" | "zone" | "inactive_users" | "meal_plan_subscribers";
          target_value?: string | null; sent_at?: string | null; sent_count?: number;
          created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["broadcasts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "broadcasts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string; user_id: string; duration_id: "1_week" | "2_weeks" | "1_month"; num_weeks: number;
          lodge: string; room: string | null; start_date: string; end_date: string;
          status: "pending_payment" | "active" | "completed" | "cancelled";
          food_subtotal: number; delivery_total: number; total_paid: number;
          deliveries_total: number; deliveries_used: number;
          flutterwave_tx_ref: string | null; flutterwave_tx_id: string | null; expires_at: string | null;
          created_at: string; paid_at: string | null; cancelled_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & {
          user_id: string; duration_id: "1_week" | "2_weeks" | "1_month"; num_weeks: number;
          lodge: string; start_date: string; end_date: string;
          food_subtotal: number; delivery_total: number; total_paid: number; deliveries_total: number;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_slots: {
        Row: {
          id: string; subscription_id: string; meal_time: "breakfast" | "lunch" | "dinner";
          addon_enabled: boolean; addon_label: string | null; addon_price_kobo: number | null;
        };
        Insert: {
          id?: string; subscription_id: string; meal_time: "breakfast" | "lunch" | "dinner";
          addon_enabled?: boolean; addon_label?: string | null; addon_price_kobo?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["subscription_slots"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscription_slots_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_slot_dishes: {
        Row: {
          id: string; subscription_slot_id: string; dish_key: string; dish_name: string;
          frequency_per_week: number; unit_price_kobo: number; scheduled_weekdays: number[];
        };
        Insert: {
          id?: string; subscription_slot_id: string; dish_key: string; dish_name: string;
          frequency_per_week: number; unit_price_kobo: number; scheduled_weekdays?: number[];
        };
        Update: Partial<Database["public"]["Tables"]["subscription_slot_dishes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscription_slot_dishes_subscription_slot_id_fkey";
            columns: ["subscription_slot_id"];
            isOneToOne: false;
            referencedRelation: "subscription_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string; user_id: string; endpoint: string; p256dh: string; auth: string;
          user_agent: string | null; created_at: string; last_seen_at: string;
        };
        Insert: {
          id?: string; user_id: string; endpoint: string; p256dh: string; auth: string;
          user_agent?: string | null; created_at?: string; last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string; user_id: string;
          kind: "order_delivered" | "deal" | "menu_drop" | "loyalty" | "cart_reminder" | "plan_renew" | "plan_expired" | "referral" | "winback";
          title: string; body: string; href: string | null; thumb_url: string | null;
          order_id: string | null; read: boolean; created_at: string;
        };
        Insert: {
          id?: string; user_id: string;
          kind: "order_delivered" | "deal" | "menu_drop" | "loyalty" | "cart_reminder" | "plan_renew" | "plan_expired" | "referral" | "winback";
          title: string; body: string; href?: string | null; thumb_url?: string | null;
          order_id?: string | null; read?: boolean; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      spin_wins: {
        Row: {
          id: string; user_id: string; prize_key: string; prize_label: string; is_try_again: boolean;
          won_at: string; expires_at: string | null; redeemed: boolean; redeemed_at: string | null;
          redeemed_order_id: string | null; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; prize_key: string; prize_label: string; is_try_again?: boolean;
          won_at?: string; expires_at?: string | null; redeemed?: boolean; redeemed_at?: string | null;
          redeemed_order_id?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["spin_wins"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "spin_wins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spin_wins_redeemed_order_id_fkey";
            columns: ["redeemed_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_with_reservation: {
        Args: {
          p_user_id: string; p_items: Json; p_lodge: string; p_room: string | null;
          p_delivery_fee: number; p_channel: string; p_source_qr: string | null; p_tx_ref: string;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      release_order_stock: { Args: { p_order_id: string }; Returns: void };
      mark_order_paid: {
        Args: { p_order_id: string; p_tx_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      link_phone_merge: {
        Args: { p_current_user_id: string; p_phone: string };
        Returns: Database["public"]["Tables"]["users"]["Row"];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      create_subscription_with_pending_payment: {
        Args: {
          p_user_id: string; p_duration_id: string; p_num_weeks: number; p_lodge: string; p_room: string | null;
          p_start_date: string; p_end_date: string; p_slots: Json;
          p_food_subtotal: number; p_delivery_total: number; p_total: number; p_deliveries_total: number;
          p_tx_ref: string;
        };
        Returns: Database["public"]["Tables"]["subscriptions"]["Row"];
      };
      mark_subscription_paid: {
        Args: { p_subscription_id: string; p_tx_id: string };
        Returns: Database["public"]["Tables"]["subscriptions"]["Row"];
      };
      expire_pending_subscription: { Args: { p_subscription_id: string }; Returns: void };
      create_subscription_delivery_order: {
        Args: {
          p_subscription_id: string; p_dish_key: string; p_dish_name: string; p_unit_price: number;
          p_addon_label: string | null; p_addon_price: number | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
    };
  };
}
