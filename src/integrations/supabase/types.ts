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
      application_events: {
        Row: {
          applicant_email: string | null
          applicant_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          startup_id: string | null
          startup_name: string
          website_url: string | null
        }
        Insert: {
          applicant_email?: string | null
          applicant_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          startup_id?: string | null
          startup_name: string
          website_url?: string | null
        }
        Update: {
          applicant_email?: string | null
          applicant_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          startup_id?: string | null
          startup_name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      bid_clicks: {
        Row: {
          created_at: string
          entry_id: string | null
          id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          id?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_clicks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "bid_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_entries: {
        Row: {
          created_at: string
          description: string | null
          display_url: string
          first_bid_at: string
          id: string
          last_bid_at: string
          logo_url: string | null
          name: string
          startup_id: string | null
          target_url: string
          total_cents: number
          url_key: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_url: string
          first_bid_at?: string
          id?: string
          last_bid_at?: string
          logo_url?: string | null
          name: string
          startup_id?: string | null
          target_url: string
          total_cents?: number
          url_key: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_url?: string
          first_bid_at?: string
          id?: string
          last_bid_at?: string
          logo_url?: string | null
          name?: string
          startup_id?: string | null
          target_url?: string
          total_cents?: number
          url_key?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount_cents: number
          created_at: string
          display_url: string
          dodo_payment_id: string | null
          email: string | null
          entry_id: string | null
          id: string
          name: string
          paid_at: string | null
          status: string
          target_url: string
          url_key: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          display_url: string
          dodo_payment_id?: string | null
          email?: string | null
          entry_id?: string | null
          id?: string
          name: string
          paid_at?: string | null
          status?: string
          target_url: string
          url_key: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          display_url?: string
          dodo_payment_id?: string | null
          email?: string | null
          entry_id?: string | null
          id?: string
          name?: string
          paid_at?: string | null
          status?: string
          target_url?: string
          url_key?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "bid_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          created_at: string
          host_startup_id: string | null
          id: string
          shown_startup_id: string | null
        }
        Insert: {
          created_at?: string
          host_startup_id?: string | null
          id?: string
          shown_startup_id?: string | null
        }
        Update: {
          created_at?: string
          host_startup_id?: string | null
          id?: string
          shown_startup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_host_startup_id_fkey"
            columns: ["host_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_shown_startup_id_fkey"
            columns: ["shown_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      featured_slots: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          dodo_payment_id: string | null
          expires_at: string
          id: string
          slot_index: number
          starts_at: string
          startup_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          dodo_payment_id?: string | null
          expires_at?: string
          id?: string
          slot_index: number
          starts_at?: string
          startup_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          dodo_payment_id?: string | null
          expires_at?: string
          id?: string
          slot_index?: number
          starts_at?: string
          startup_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_slots_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_waitlist: {
        Row: {
          claim_expires_at: string | null
          claim_token: string | null
          created_at: string
          id: string
          notified_at: string | null
          startup_id: string | null
          user_id: string
        }
        Insert: {
          claim_expires_at?: string | null
          claim_token?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          startup_id?: string | null
          user_id: string
        }
        Update: {
          claim_expires_at?: string | null
          claim_token?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          startup_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_waitlist_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      impressions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          host_startup_id: string | null
          id: string
          os: string | null
          path: string | null
          referrer: string | null
          session_id: string | null
          shown_startup_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          host_startup_id?: string | null
          id?: string
          os?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          shown_startup_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          host_startup_id?: string | null
          id?: string
          os?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          shown_startup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impressions_host_startup_id_fkey"
            columns: ["host_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressions_shown_startup_id_fkey"
            columns: ["shown_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      network_stats_daily: {
        Row: {
          clicks: number
          date: string
          impressions: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          date: string
          impressions?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          date?: string
          impressions?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          consumed_at: string | null
          created_at: string
          dodo_payment_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          dodo_payment_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          dodo_payment_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          twitter_handle: string | null
          updated_at: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          twitter_handle?: string | null
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          twitter_handle?: string | null
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      saved_startups: {
        Row: {
          created_at: string
          id: string
          startup_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          startup_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          startup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_startups_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_stats_daily: {
        Row: {
          clicks_given: number
          clicks_received: number
          date: string
          impressions_given: number
          impressions_received: number
          startup_id: string
          updated_at: string
        }
        Insert: {
          clicks_given?: number
          clicks_received?: number
          date: string
          impressions_given?: number
          impressions_received?: number
          startup_id: string
          updated_at?: string
        }
        Update: {
          clicks_given?: number
          clicks_received?: number
          date?: string
          impressions_given?: number
          impressions_received?: number
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_stats_daily_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_stats_totals: {
        Row: {
          clicks_given: number
          clicks_received: number
          impressions_given: number
          impressions_received: number
          startup_id: string
          updated_at: string
        }
        Insert: {
          clicks_given?: number
          clicks_received?: number
          impressions_given?: number
          impressions_received?: number
          startup_id: string
          updated_at?: string
        }
        Update: {
          clicks_given?: number
          clicks_received?: number
          impressions_given?: number
          impressions_received?: number
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_stats_totals_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: true
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          banned: boolean
          created_at: string
          description: string
          edit_status: string
          edit_submitted_at: string | null
          founder_avatar_url: string | null
          founder_name: string | null
          founder_quote: string | null
          id: string
          iframe_blocked: boolean | null
          logo_url: string | null
          membership_mode: string
          name: string
          pending_description: string | null
          pending_name: string | null
          rejection_reason: string | null
          slug: string | null
          sponsored: boolean
          status: Database["public"]["Enums"]["startup_status"]
          strike_count: number
          supporter_cancel_at_period_end: boolean
          supporter_subscription_id: string | null
          supporter_until: string | null
          tracking_last_seen_at: string | null
          updated_at: string
          user_id: string
          warn_expires_at: string | null
          warned_at: string | null
          website_url: string
          widget_currently_visible: boolean | null
          widget_hidden_at: string | null
          widget_last_heartbeat_at: string | null
          widget_last_page_url: string | null
          widget_placement: string
        }
        Insert: {
          banned?: boolean
          created_at?: string
          description: string
          edit_status?: string
          edit_submitted_at?: string | null
          founder_avatar_url?: string | null
          founder_name?: string | null
          founder_quote?: string | null
          id?: string
          iframe_blocked?: boolean | null
          logo_url?: string | null
          membership_mode?: string
          name: string
          pending_description?: string | null
          pending_name?: string | null
          rejection_reason?: string | null
          slug?: string | null
          sponsored?: boolean
          status?: Database["public"]["Enums"]["startup_status"]
          strike_count?: number
          supporter_cancel_at_period_end?: boolean
          supporter_subscription_id?: string | null
          supporter_until?: string | null
          tracking_last_seen_at?: string | null
          updated_at?: string
          user_id: string
          warn_expires_at?: string | null
          warned_at?: string | null
          website_url: string
          widget_currently_visible?: boolean | null
          widget_hidden_at?: string | null
          widget_last_heartbeat_at?: string | null
          widget_last_page_url?: string | null
          widget_placement?: string
        }
        Update: {
          banned?: boolean
          created_at?: string
          description?: string
          edit_status?: string
          edit_submitted_at?: string | null
          founder_avatar_url?: string | null
          founder_name?: string | null
          founder_quote?: string | null
          id?: string
          iframe_blocked?: boolean | null
          logo_url?: string | null
          membership_mode?: string
          name?: string
          pending_description?: string | null
          pending_name?: string | null
          rejection_reason?: string | null
          slug?: string | null
          sponsored?: boolean
          status?: Database["public"]["Enums"]["startup_status"]
          strike_count?: number
          supporter_cancel_at_period_end?: boolean
          supporter_subscription_id?: string | null
          supporter_until?: string | null
          tracking_last_seen_at?: string | null
          updated_at?: string
          user_id?: string
          warn_expires_at?: string | null
          warned_at?: string | null
          website_url?: string
          widget_currently_visible?: boolean | null
          widget_hidden_at?: string | null
          widget_last_heartbeat_at?: string | null
          widget_last_page_url?: string | null
          widget_placement?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_all_startups: {
        Args: never
        Returns: {
          banned: boolean
          created_at: string
          description: string
          edit_status: string
          edit_submitted_at: string | null
          founder_avatar_url: string | null
          founder_name: string | null
          founder_quote: string | null
          id: string
          iframe_blocked: boolean | null
          logo_url: string | null
          membership_mode: string
          name: string
          pending_description: string | null
          pending_name: string | null
          rejection_reason: string | null
          slug: string | null
          sponsored: boolean
          status: Database["public"]["Enums"]["startup_status"]
          strike_count: number
          supporter_cancel_at_period_end: boolean
          supporter_subscription_id: string | null
          supporter_until: string | null
          tracking_last_seen_at: string | null
          updated_at: string
          user_id: string
          warn_expires_at: string | null
          warned_at: string | null
          website_url: string
          widget_currently_visible: boolean | null
          widget_hidden_at: string | null
          widget_last_heartbeat_at: string | null
          widget_last_page_url: string | null
          widget_placement: string
        }[]
        SetofOptions: {
          from: "*"
          to: "startups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_founder_info: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      admin_orphan_payments: {
        Args: { _older_than_minutes?: number }
        Returns: {
          created_at: string
          dodo_payment_id: string
          email: string
          id: string
          user_id: string
        }[]
      }
      confirm_bid_payment: {
        Args: { _bid_id: string; _email?: string; _payment_id: string }
        Returns: {
          already: boolean
          entry_id: string
          rank: number
          total_cents: number
        }[]
      }
      consume_prepaid_listing: { Args: { _user_id: string }; Returns: string }
      dashboard_host_shown_7d: {
        Args: { _host: string }
        Returns: {
          appearance_count: number
          description: string
          last_shown_at: string
          logo_url: string
          name: string
          startup_id: string
          website_url: string
        }[]
      }
      dashboard_startup_hosts_7d: {
        Args: { _startup: string }
        Returns: {
          appearance_count: number
          host_id: string
          last_shown_at: string
          logo_url: string
          name: string
          slug: string
          website_url: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      digest_impression_count_for: {
        Args: { _since: string; _startup: string; _until: string }
        Returns: number
      }
      digest_impression_counts: {
        Args: { _since: string }
        Returns: {
          cnt: number
          shown_startup_id: string
        }[]
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          twitter_handle: string
        }[]
      }
      get_my_startups: {
        Args: never
        Returns: {
          banned: boolean
          created_at: string
          description: string
          edit_status: string
          edit_submitted_at: string | null
          founder_avatar_url: string | null
          founder_name: string | null
          founder_quote: string | null
          id: string
          iframe_blocked: boolean | null
          logo_url: string | null
          membership_mode: string
          name: string
          pending_description: string | null
          pending_name: string | null
          rejection_reason: string | null
          slug: string | null
          sponsored: boolean
          status: Database["public"]["Enums"]["startup_status"]
          strike_count: number
          supporter_cancel_at_period_end: boolean
          supporter_subscription_id: string | null
          supporter_until: string | null
          tracking_last_seen_at: string | null
          updated_at: string
          user_id: string
          warn_expires_at: string | null
          warned_at: string | null
          website_url: string
          widget_currently_visible: boolean | null
          widget_hidden_at: string | null
          widget_last_heartbeat_at: string | null
          widget_last_page_url: string | null
          widget_placement: string
        }[]
        SetofOptions: {
          from: "*"
          to: "startups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_startup_rank: { Args: { _startup_id: string }; Returns: number }
      is_approved_host: { Args: { _id: string }; Returns: boolean }
      is_approved_startup: { Args: { _id: string }; Returns: boolean }
      is_supporter: { Args: { _id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_bids: {
        Args: never
        Returns: {
          amount_cents: number
          created_at: string
          display_url: string
          entry_total_cents: number
          id: string
          name: string
          status: string
        }[]
      }
      public_bid_activity: {
        Args: { _limit?: number }
        Returns: {
          amount_cents: number
          created_at: string
          display_url: string
          entry_id: string
          logo_url: string
          name: string
          rank: number
        }[]
      }
      public_bid_board: {
        Args: never
        Returns: {
          clicks: number
          description: string
          display_url: string
          first_bid_at: string
          id: string
          last_bid_at: string
          logo_url: string
          name: string
          on_network: boolean
          rank: number
          startup_slug: string
          target_url: string
          total_cents: number
          url_key: string
        }[]
      }
      public_bid_click: {
        Args: { _entry_id: string; _session?: string }
        Returns: undefined
      }
      public_bid_lookup: {
        Args: { _url_key: string }
        Returns: {
          display_url: string
          id: string
          name: string
          rank: number
          total_cents: number
        }[]
      }
      public_bid_stats: {
        Args: never
        Returns: {
          entries: number
          top_cents: number
          total_cents: number
          total_clicks: number
        }[]
      }
      public_bid_trending: {
        Args: { _limit?: number }
        Returns: {
          clicks_hour: number
          display_url: string
          entry_id: string
          logo_url: string
          name: string
        }[]
      }
      public_featured_slots: {
        Args: never
        Returns: {
          description: string
          expires_at: string
          founder_avatar_url: string
          founder_name: string
          logo_url: string
          name: string
          slot_index: number
          slug: string
          startup_id: string
          twitter_handle: string
          website_url: string
        }[]
      }
      public_founder_info: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          twitter_handle: string
        }[]
      }
      public_founder_info_bulk: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      public_host_recent_shown: {
        Args: { _host: string; _limit?: number }
        Returns: {
          description: string
          last_shown_at: string
          logo_url: string
          name: string
          startup_id: string
          website_url: string
        }[]
      }
      public_network_activity: {
        Args: never
        Returns: {
          today_clicks: number
          today_impressions: number
          yesterday_clicks: number
          yesterday_impressions: number
        }[]
      }
      public_network_totals: {
        Args: { _ids: string[] }
        Returns: {
          total_clicks: number
          total_impressions: number
        }[]
      }
      public_network_totals_all: {
        Args: never
        Returns: {
          total_clicks: number
          total_impressions: number
        }[]
      }
      public_startup_24h: {
        Args: { _ids: string[] }
        Returns: {
          clicks_24h: number
          impressions_24h: number
          startup_id: string
        }[]
      }
      public_startup_daily: {
        Args: { _ids: string[] }
        Returns: {
          day_offset: number
          given: number
          received: number
          startup_id: string
        }[]
      }
      public_startup_daily_v2: {
        Args: { _ids: string[] }
        Returns: {
          clicks: number
          clicks_given: number
          day_offset: number
          given: number
          received: number
          startup_id: string
        }[]
      }
      public_startup_dashboard_summary: {
        Args: { _startup_id: string }
        Returns: {
          clicks: number
          daily_impressions: number[]
          impressions: number
          rank: number
        }[]
      }
      public_startup_hourly: {
        Args: { _ids: string[] }
        Returns: {
          clicks: number
          given: number
          hour_offset: number
          received: number
          startup_id: string
        }[]
      }
      public_startup_monthly: {
        Args: { _ids: string[] }
        Returns: {
          clicks: number
          given: number
          month_offset: number
          received: number
          startup_id: string
        }[]
      }
      public_startup_profile_views: {
        Args: { _since?: string; _startup_id: string }
        Returns: number
      }
      public_startup_pulse: { Args: { _startup_id: string }; Returns: number }
      public_startup_range_data: {
        Args: { _range: string; _startup_id: string }
        Returns: {
          chart_data: number[]
          clicks: number
          impressions: number
          labels: string[]
        }[]
      }
      public_startup_recent_hosts: {
        Args: { _limit?: number; _startup: string }
        Returns: {
          host_id: string
          last_shown_at: string
          logo_url: string
          name: string
          slug: string
          website_url: string
        }[]
      }
      public_startup_referrers: {
        Args: { _startup_id: string }
        Returns: {
          cnt: number
          logo_url: string
          name: string
          slug: string
          startup_id: string
          website_url: string
        }[]
      }
      public_startup_totals: {
        Args: { _ids: string[] }
        Returns: {
          clicks: number
          clicks_given: number
          impressions: number
          impressions_given: number
          startup_id: string
        }[]
      }
      public_startup_traffic_breakdown: {
        Args: { _startup_id: string }
        Returns: {
          countries: Json
          devices: Json
          top_referrers: Json
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      widget_pick_weights: {
        Args: never
        Returns: {
          startup_id: string
          weight: number
        }[]
      }
    }
    Enums: {
      startup_status: "pending" | "approved" | "rejected"
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
      startup_status: ["pending", "approved", "rejected"],
    },
  },
} as const
