export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_profile_id: string
          created_at?: string
          created_by: string
          employee_id: string
          id?: string
          reminder_sent_at?: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_profile_id?: string
          created_at?: string
          created_by?: string
          employee_id?: string
          id?: string
          reminder_sent_at?: string | null
          service_id?: string
          slot?: unknown
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_public_profiles"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string
          day_of_week: number
          id: string
          opens_at: string
        }
        Insert: {
          business_id: string
          closes_at: string
          day_of_week: number
          id?: string
          opens_at: string
        }
        Update: {
          business_id?: string
          closes_at?: string
          day_of_week?: number
          id?: string
          opens_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          approval_policy: Database["public"]["Enums"]["approval_policy"]
          area: string
          booking_notes: string | null
          cancellation_window_hours: number
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_profile_id: string
          payment_notes: string | null
          phone: string
          photo_paths: string[]
          status: Database["public"]["Enums"]["business_status"]
          timezone: string
        }
        Insert: {
          address: string
          approval_policy?: Database["public"]["Enums"]["approval_policy"]
          area: string
          booking_notes?: string | null
          cancellation_window_hours?: number
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_profile_id: string
          payment_notes?: string | null
          phone: string
          photo_paths?: string[]
          status?: Database["public"]["Enums"]["business_status"]
          timezone?: string
        }
        Update: {
          address?: string
          approval_policy?: Database["public"]["Enums"]["approval_policy"]
          area?: string
          booking_notes?: string | null
          cancellation_window_hours?: number
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_profile_id?: string
          payment_notes?: string | null
          phone?: string
          photo_paths?: string[]
          status?: Database["public"]["Enums"]["business_status"]
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "businesses_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "businesses_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          icon?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      employee_availability_rules: {
        Row: {
          created_at: string
          day_of_week: number | null
          effective_range: unknown
          employee_id: string
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["availability_rule_kind"]
          service_id: string | null
          starts_at: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          effective_range?: unknown
          employee_id: string
          ends_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["availability_rule_kind"]
          service_id?: string | null
          starts_at?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          effective_range?: unknown
          employee_id?: string
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["availability_rule_kind"]
          service_id?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_rules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_availability_rules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_public_profiles"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_availability_rules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          business_id: string
          created_at: string
          id: string
          position_title: string
          profile_id: string
          status: Database["public"]["Enums"]["employee_status"]
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          position_title?: string
          profile_id: string
          status?: Database["public"]["Enums"]["employee_status"]
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          position_title?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["employee_status"]
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          business_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["join_request_status"]
        }
        Insert: {
          business_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          profile_id: string
          status?: Database["public"]["Enums"]["join_request_status"]
        }
        Update: {
          business_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["join_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "join_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "join_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          emailed_at: string | null
          id: string
          payload: Json
          profile_id: string
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          emailed_at?: string | null
          id?: string
          payload?: Json
          profile_id: string
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          emailed_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          location: string | null
          phone: string | null
          status: Database["public"]["Enums"]["profile_status"]
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id: string
          location?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string
          id: string
          reporter_profile_id: string
          resolution_note: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          reporter_profile_id: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          reporter_profile_id?: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          buffer_minutes: number
          created_at: string
          description: string | null
          duration_minutes: number
          employee_id: string
          id: string
          name: string
          price: number
          status: Database["public"]["Enums"]["service_status"]
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          description?: string | null
          duration_minutes: number
          employee_id: string
          id?: string
          name: string
          price: number
          status?: Database["public"]["Enums"]["service_status"]
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          employee_id?: string
          id?: string
          name?: string
          price?: number
          status?: Database["public"]["Enums"]["service_status"]
        }
        Relationships: [
          {
            foreignKeyName: "services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_public_profiles"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_employee_targets: {
        Row: {
          employee_id: string
          waitlist_entry_id: string
        }
        Insert: {
          employee_id: string
          waitlist_entry_id: string
        }
        Update: {
          employee_id?: string
          waitlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_employee_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "waitlist_employee_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_public_profiles"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "waitlist_employee_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_employee_targets_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          business_id: string
          client_profile_id: string
          created_at: string
          from_ts: string
          id: string
          matched_at: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["waitlist_status"]
          to_ts: string
        }
        Insert: {
          business_id: string
          client_profile_id: string
          created_at?: string
          from_ts: string
          id?: string
          matched_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          to_ts: string
        }
        Update: {
          business_id?: string
          client_profile_id?: string
          created_at?: string
          from_ts?: string
          id?: string
          matched_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          to_ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "waitlist_entries_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "waitlist_entries_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      business_client_contacts: {
        Row: {
          business_id: string | null
          full_name: string | null
          phone: string | null
          profile_id: string | null
        }
        Relationships: []
      }
      business_join_request_contacts: {
        Row: {
          business_id: string | null
          email: string | null
          full_name: string | null
          phone: string | null
          profile_id: string | null
          request_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_staff_contacts: {
        Row: {
          business_id: string | null
          email: string | null
          employee_id: string | null
          phone: string | null
          profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_public_profiles: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          employee_id: string | null
          full_name: string | null
          position_title: string | null
          profile_id: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_join_request_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_staff_contacts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _insert_appointment: {
        Args: {
          p_actor_profile_id: string
          p_client_profile_id: string
          p_employee_id: string
          p_pre_approved: boolean
          p_service_id: string
          p_starts_at: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _range_diff: { Args: { base: unknown; cut: unknown }; Returns: unknown[] }
      _write_audit_log: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      approve_appointment: {
        Args: { p_actor_profile_id: string; p_appointment_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_appointment: {
        Args: {
          p_actor_profile_id: string
          p_client_profile_id: string
          p_employee_id: string
          p_service_id: string
          p_starts_at: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_appointment: {
        Args: { p_actor_profile_id: string; p_appointment_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_business_account_type: {
        Args: never
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          location: string | null
          phone: string | null
          status: Database["public"]["Enums"]["profile_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_waitlist_entry: {
        Args: {
          p_actor_profile_id: string
          p_employee_id: string
          p_service_id: string
          p_starts_at: string
          p_waitlist_entry_id: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_business_with_owner: {
        Args: {
          p_address: string
          p_approval_policy?: Database["public"]["Enums"]["approval_policy"]
          p_area: string
          p_booking_notes?: string
          p_cancellation_window_hours?: number
          p_category_id: string
          p_description?: string
          p_name: string
          p_payment_notes?: string
          p_phone: string
          p_photo_url?: string
          p_position_title?: string
          p_timezone?: string
        }
        Returns: {
          address: string
          approval_policy: Database["public"]["Enums"]["approval_policy"]
          area: string
          booking_notes: string | null
          cancellation_window_hours: number
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_profile_id: string
          payment_notes: string | null
          phone: string
          photo_paths: string[]
          status: Database["public"]["Enums"]["business_status"]
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_join_request: {
        Args: {
          p_decision: Database["public"]["Enums"]["join_request_status"]
          p_position_title?: string
          p_request_id: string
        }
        Returns: {
          business_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["join_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "join_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_business: { Args: { p_business_id: string }; Returns: undefined }
      get_available_slots: {
        Args: {
          p_employee_id: string
          p_from: string
          p_service_id: string
          p_to: string
        }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_next_available: {
        Args: {
          p_business_id: string
          p_from: string
          p_hour_from?: string
          p_hour_to?: string
          p_service_query?: string
          p_to: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_employee_of: { Args: { p_business_id: string }; Returns: boolean }
      is_owner_of: { Args: { p_business_id: string }; Returns: boolean }
      match_waitlist_for_slot: {
        Args: {
          p_employee_id: string
          p_freed_slot: unknown
          p_service_id: string
        }
        Returns: undefined
      }
      reject_appointment: {
        Args: {
          p_actor_profile_id: string
          p_appointment_id: string
          p_reason?: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_employee: { Args: { p_employee_id: string }; Returns: boolean }
      reschedule_appointment: {
        Args: {
          p_actor_profile_id: string
          p_appointment_id: string
          p_new_starts_at: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          client_profile_id: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          reminder_sent_at: string | null
          service_id: string
          slot: unknown
          status: Database["public"]["Enums"]["appointment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sweep_appointment_reminders: {
        Args: never
        Returns: {
          reminded: number
        }[]
      }
      sweep_waitlist_expiry: {
        Args: never
        Returns: {
          expired: number
          released: number
        }[]
      }
    }
    Enums: {
      account_type: "BUSINESS" | "CLIENT" | "ADMIN"
      appointment_status: "PENDING" | "CONFIRMED" | "CANCELLED"
      approval_policy: "AUTO" | "MANUAL"
      availability_rule_kind:
        | "WEEKLY_WINDOW"
        | "EXCEPTION"
        | "VACATION"
        | "BLOCK"
      business_status: "ACTIVE" | "SUSPENDED"
      employee_status: "ACTIVE" | "INACTIVE"
      join_request_status: "PENDING" | "APPROVED" | "REJECTED"
      notification_type:
        | "JOIN_REQUEST_RECEIVED"
        | "JOIN_REQUEST_DECIDED"
        | "APPOINTMENT_CREATED"
        | "APPOINTMENT_CONFIRMED"
        | "APPOINTMENT_REJECTED"
        | "APPOINTMENT_CANCELLED"
        | "APPOINTMENT_RESCHEDULED"
        | "WAITLIST_MATCHED"
        | "APPOINTMENT_REMINDER"
        | "BUSINESS_DELETED"
      profile_status: "ACTIVE" | "SUSPENDED"
      report_status: "OPEN" | "RESOLVED" | "DISMISSED"
      report_target_type: "BUSINESS" | "PROFILE" | "APPOINTMENT"
      service_status: "ACTIVE" | "INACTIVE"
      waitlist_status: "ACTIVE" | "MATCHED" | "CLAIMED" | "EXPIRED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["BUSINESS", "CLIENT", "ADMIN"],
      appointment_status: ["PENDING", "CONFIRMED", "CANCELLED"],
      approval_policy: ["AUTO", "MANUAL"],
      availability_rule_kind: [
        "WEEKLY_WINDOW",
        "EXCEPTION",
        "VACATION",
        "BLOCK",
      ],
      business_status: ["ACTIVE", "SUSPENDED"],
      employee_status: ["ACTIVE", "INACTIVE"],
      join_request_status: ["PENDING", "APPROVED", "REJECTED"],
      notification_type: [
        "JOIN_REQUEST_RECEIVED",
        "JOIN_REQUEST_DECIDED",
        "APPOINTMENT_CREATED",
        "APPOINTMENT_CONFIRMED",
        "APPOINTMENT_REJECTED",
        "APPOINTMENT_CANCELLED",
        "APPOINTMENT_RESCHEDULED",
        "WAITLIST_MATCHED",
        "APPOINTMENT_REMINDER",
        "BUSINESS_DELETED",
      ],
      profile_status: ["ACTIVE", "SUSPENDED"],
      report_status: ["OPEN", "RESOLVED", "DISMISSED"],
      report_target_type: ["BUSINESS", "PROFILE", "APPOINTMENT"],
      service_status: ["ACTIVE", "INACTIVE"],
      waitlist_status: ["ACTIVE", "MATCHED", "CLAIMED", "EXPIRED"],
    },
  },
} as const

