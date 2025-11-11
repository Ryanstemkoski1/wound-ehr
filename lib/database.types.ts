export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      assessments: {
        Row: {
          id: string;
          visit_id: string;
          wound_id: string;
          length: number | null;
          width: number | null;
          depth: number | null;
          area: number | null;
          undermining: string | null;
          tunneling: string | null;
          exudate_amount: string | null;
          exudate_type: string | null;
          odor: string | null;
          wound_bed: string | null;
          periwound_condition: string | null;
          pain_level: number | null;
          healing_status: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          wound_id: string;
          length?: number | null;
          width?: number | null;
          depth?: number | null;
          area?: number | null;
          undermining?: string | null;
          tunneling?: string | null;
          exudate_amount?: string | null;
          exudate_type?: string | null;
          odor?: string | null;
          wound_bed?: string | null;
          periwound_condition?: string | null;
          pain_level?: number | null;
          healing_status?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          wound_id?: string;
          length?: number | null;
          width?: number | null;
          depth?: number | null;
          area?: number | null;
          undermining?: string | null;
          tunneling?: string | null;
          exudate_amount?: string | null;
          exudate_type?: string | null;
          odor?: string | null;
          wound_bed?: string | null;
          periwound_condition?: string | null;
          pain_level?: number | null;
          healing_status?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      billings: {
        Row: {
          id: string;
          visit_id: string;
          cpt_codes: Json;
          icd_codes: Json;
          total_charges: number;
          insurance_billed: number | null;
          patient_responsibility: number | null;
          status: string;
          claim_number: string | null;
          submitted_date: string | null;
          paid_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          cpt_codes: Json;
          icd_codes: Json;
          total_charges: number;
          insurance_billed?: number | null;
          patient_responsibility?: number | null;
          status?: string;
          claim_number?: string | null;
          submitted_date?: string | null;
          paid_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          cpt_codes?: Json;
          icd_codes?: Json;
          total_charges?: number;
          insurance_billed?: number | null;
          patient_responsibility?: number | null;
          status?: string;
          claim_number?: string | null;
          submitted_date?: string | null;
          paid_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      facilities: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          facility_id: string;
          first_name: string;
          last_name: string;
          dob: string;
          mrn: string;
          gender: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          insurance_info: Json | null;
          emergency_contact: Json | null;
          allergies: Json | null;
          medical_history: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          first_name: string;
          last_name: string;
          dob: string;
          mrn: string;
          gender?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          insurance_info?: Json | null;
          emergency_contact?: Json | null;
          allergies?: Json | null;
          medical_history?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          first_name?: string;
          last_name?: string;
          dob?: string;
          mrn?: string;
          gender?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          insurance_info?: Json | null;
          emergency_contact?: Json | null;
          allergies?: Json | null;
          medical_history?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          wound_id: string;
          visit_id: string | null;
          photo_url: string;
          thumbnail_url: string | null;
          caption: string | null;
          captured_at: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          wound_id: string;
          visit_id?: string | null;
          photo_url: string;
          thumbnail_url?: string | null;
          caption?: string | null;
          captured_at?: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          wound_id?: string;
          visit_id?: string | null;
          photo_url?: string;
          thumbnail_url?: string | null;
          caption?: string | null;
          captured_at?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          subdomain: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subdomain?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subdomain?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      treatments: {
        Row: {
          id: string;
          wound_id: string;
          visit_id: string | null;
          treatment_type: string;
          product_used: string | null;
          frequency: string | null;
          instructions: string | null;
          start_date: string;
          end_date: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          wound_id: string;
          visit_id?: string | null;
          treatment_type: string;
          product_used?: string | null;
          frequency?: string | null;
          instructions?: string | null;
          start_date: string;
          end_date?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          wound_id?: string;
          visit_id?: string | null;
          treatment_type?: string;
          product_used?: string | null;
          frequency?: string | null;
          instructions?: string | null;
          start_date?: string;
          end_date?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      user_facilities: {
        Row: {
          id: string;
          user_id: string;
          facility_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          facility_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          facility_id?: string;
          created_at?: string;
        };
      };
      user_invites: {
        Row: {
          id: string;
          email: string;
          tenant_id: string;
          role: string;
          facility_id: string | null;
          invited_by: string;
          invite_token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          tenant_id: string;
          role: string;
          facility_id?: string | null;
          invited_by: string;
          invite_token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tenant_id?: string;
          role?: string;
          facility_id?: string | null;
          invited_by?: string;
          invite_token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: string;
          facility_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role: string;
          facility_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          role?: string;
          facility_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      visits: {
        Row: {
          id: string;
          patient_id: string;
          facility_id: string;
          visit_date: string;
          visit_type: string;
          location: string | null;
          status: string;
          notes: string | null;
          follow_up_type: string | null;
          follow_up_date: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          facility_id: string;
          visit_date: string;
          visit_type: string;
          location?: string | null;
          status?: string;
          notes?: string | null;
          follow_up_type?: string | null;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          facility_id?: string;
          visit_date?: string;
          visit_type?: string;
          location?: string | null;
          status?: string;
          notes?: string | null;
          follow_up_type?: string | null;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      wound_notes: {
        Row: {
          id: string;
          wound_id: string;
          visit_id: string | null;
          note: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wound_id: string;
          visit_id?: string | null;
          note: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wound_id?: string;
          visit_id?: string | null;
          note?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      wounds: {
        Row: {
          id: string;
          patient_id: string;
          wound_number: number;
          location: string;
          wound_type: string;
          onset_date: string;
          status: string;
          healing_status: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          wound_number: number;
          location: string;
          wound_type: string;
          onset_date: string;
          status?: string;
          healing_status?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          wound_number?: number;
          location?: string;
          wound_type?: string;
          onset_date?: string;
          status?: string;
          healing_status?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_tenant_id: {
        Args: { user_uuid: string };
        Returns: string | null;
      };
      has_facility_access: {
        Args: { user_uuid: string; facility_uuid: string };
        Returns: boolean;
      };
      is_tenant_admin: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
