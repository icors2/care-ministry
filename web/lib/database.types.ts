export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "member";

export type VisitRequestStatus =
  | "new"
  | "pending_member"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

export type AssignmentStatus = "pending" | "accepted" | "declined";

type EmptyRel = [];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          display_name: string | null;
          phone_digits: string | null;
          mms_gateway_domain: string | null;
          contact_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          display_name?: string | null;
          phone_digits?: string | null;
          mms_gateway_domain?: string | null;
          contact_email?: string | null;
        };
        Update: {
          role?: UserRole;
          display_name?: string | null;
          phone_digits?: string | null;
          mms_gateway_domain?: string | null;
          contact_email?: string | null;
        };
        Relationships: EmptyRel;
      };
      visit_requests: {
        Row: {
          id: string;
          congregant_name: string;
          address: string;
          phone: string;
          preferred_times_text: string | null;
          prayer_requests: string | null;
          special_instructions: string | null;
          visit_window_start: string | null;
          visit_window_end: string | null;
          status: VisitRequestStatus;
          consent_contact: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          congregant_name: string;
          address: string;
          phone: string;
          preferred_times_text?: string | null;
          prayer_requests?: string | null;
          special_instructions?: string | null;
          visit_window_start?: string | null;
          visit_window_end?: string | null;
          status?: VisitRequestStatus;
          consent_contact?: boolean;
        };
        Update: {
          congregant_name?: string;
          address?: string;
          phone?: string;
          preferred_times_text?: string | null;
          prayer_requests?: string | null;
          special_instructions?: string | null;
          visit_window_start?: string | null;
          visit_window_end?: string | null;
          status?: VisitRequestStatus;
          consent_contact?: boolean;
        };
        Relationships: EmptyRel;
      };
      availability_blocks: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          timezone?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          timezone?: string;
        };
        Relationships: EmptyRel;
      };
      visit_assignments: {
        Row: {
          id: string;
          visit_request_id: string;
          assignee_id: string;
          response_token: string;
          status: AssignmentStatus;
          notification_sent_at: string | null;
          accepted_at: string | null;
          declined_at: string | null;
          post_visit_notes: string | null;
          reminder_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_request_id: string;
          assignee_id: string;
          response_token?: string;
          status?: AssignmentStatus;
          notification_sent_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          post_visit_notes?: string | null;
          reminder_sent_at?: string | null;
        };
        Update: {
          status?: AssignmentStatus;
          notification_sent_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          post_visit_notes?: string | null;
          reminder_sent_at?: string | null;
        };
        Relationships: EmptyRel;
      };
      intake_rate_log: {
        Row: {
          id: number;
          ip_hash: string;
          created_at: string;
        };
        Insert: {
          ip_hash: string;
        };
        Update: {
          ip_hash?: string;
        };
        Relationships: EmptyRel;
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          meta?: Json;
        };
        Update: {
          actor_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          meta?: Json;
        };
        Relationships: EmptyRel;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
