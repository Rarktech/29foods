// Hand-authored to match supabase/migrations/20260920000000_init_schema.sql.
// Replace with the real output of `supabase gen types typescript --linked` once
// the project is linked (Setup checklist, step 1) — keep the shape in sync until then.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      admin_profiles: {
        Row: { id: string; role: "owner" | "admin"; name: string | null; created_at: string };
        Insert: { id: string; role: "owner" | "admin"; name?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["admin_profiles"]["Insert"]>;
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
      };
      users: {
        Row: {
          id: string; auth_uid: string | null; telegram_id: number | null; phone: string | null;
          email: string | null; name: string | null; avatar_url: string | null;
          lodge: string | null; room: string | null; acquired_via_qr: string | null;
          favourites: Json; loyalty_points: number; last_order_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; auth_uid?: string | null; telegram_id?: number | null; phone?: string | null;
          email?: string | null; name?: string | null; avatar_url?: string | null;
          lodge?: string | null; room?: string | null; acquired_via_qr?: string | null;
          favourites?: Json; loyalty_points?: number; last_order_at?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      menu_items: {
        Row: {
          id: string; name: string; category: "rice" | "protein" | "drink" | "snack"; price: number;
          is_available: boolean; image_url: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; category: "rice" | "protein" | "drink" | "snack"; price: number;
          is_available?: boolean; image_url?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
      };
      inventory: {
        Row: { menu_item_id: string; stock_count: number; low_stock_threshold: number; updated_at: string };
        Insert: { menu_item_id: string; stock_count?: number; low_stock_threshold?: number; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["inventory"]["Insert"]>;
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
      };
      orders: {
        Row: {
          id: string; user_id: string; items: Json; subtotal: number; delivery_fee: number; total: number;
          lodge: string; room: string | null;
          payment_status: "pending" | "paid" | "failed" | "refunded";
          order_status: "placed" | "paid" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
          assigned_rider_id: string | null; source_qr: string | null; channel: "web" | "telegram";
          flutterwave_tx_ref: string | null; flutterwave_tx_id: string | null; expires_at: string | null;
          created_at: string; paid_at: string | null; delivered_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          user_id: string; items: Json; subtotal: number; total: number; lodge: string; channel: "web" | "telegram";
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
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
      };
      feedback: {
        Row: {
          id: string; order_id: string; user_id: string; reaction: "fire" | "neutral" | "down";
          comment: string | null; created_at: string;
        };
        Insert: {
          id?: string; order_id: string; user_id: string; reaction: "fire" | "neutral" | "down";
          comment?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
      };
      broadcasts: {
        Row: {
          id: string; message: string; target: "all" | "lodge" | "zone" | "inactive_users";
          target_value: string | null; sent_at: string | null; sent_count: number;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; message: string; target: "all" | "lodge" | "zone" | "inactive_users";
          target_value?: string | null; sent_at?: string | null; sent_count?: number;
          created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["broadcasts"]["Insert"]>;
      };
    };
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
    };
  };
}
