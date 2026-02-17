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
    PostgrestVersion: "13.0.5"
  }
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
      addendum_notifications: {
        Row: {
          addendum_id: string
          created_at: string | null
          created_by: string
          id: string
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          visit_id: string
        }
        Insert: {
          addendum_id: string
          created_at?: string | null
          created_by: string
          id?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          visit_id: string
        }
        Update: {
          addendum_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addendum_notifications_addendum_id_fkey"
            columns: ["addendum_id"]
            isOneToOne: false
            referencedRelation: "wound_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addendum_notifications_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          area: number | null
          assessment_notes: string | null
          at_risk_reopening: boolean | null
          created_at: string | null
          depth: number | null
          epithelial_percent: number | null
          exudate_amount: string | null
          exudate_type: string | null
          granulation_percent: number | null
          healing_status: string | null
          id: string
          infection_signs: Json | null
          length: number | null
          odor: string | null
          pain_level: number | null
          periwound_condition: string | null
          pressure_stage: string | null
          slough_percent: number | null
          tunneling: string | null
          undermining: string | null
          updated_at: string | null
          visit_id: string
          width: number | null
          wound_id: string
          wound_type: string | null
        }
        Insert: {
          area?: number | null
          assessment_notes?: string | null
          at_risk_reopening?: boolean | null
          created_at?: string | null
          depth?: number | null
          epithelial_percent?: number | null
          exudate_amount?: string | null
          exudate_type?: string | null
          granulation_percent?: number | null
          healing_status?: string | null
          id?: string
          infection_signs?: Json | null
          length?: number | null
          odor?: string | null
          pain_level?: number | null
          periwound_condition?: string | null
          pressure_stage?: string | null
          slough_percent?: number | null
          tunneling?: string | null
          undermining?: string | null
          updated_at?: string | null
          visit_id: string
          width?: number | null
          wound_id: string
          wound_type?: string | null
        }
        Update: {
          area?: number | null
          assessment_notes?: string | null
          at_risk_reopening?: boolean | null
          created_at?: string | null
          depth?: number | null
          epithelial_percent?: number | null
          exudate_amount?: string | null
          exudate_type?: string | null
          granulation_percent?: number | null
          healing_status?: string | null
          id?: string
          infection_signs?: Json | null
          length?: number | null
          odor?: string | null
          pain_level?: number | null
          periwound_condition?: string | null
          pressure_stage?: string | null
          slough_percent?: number | null
          tunneling?: string | null
          undermining?: string | null
          updated_at?: string | null
          visit_id?: string
          width?: number | null
          wound_id?: string
          wound_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_wound_id_fkey"
            columns: ["wound_id"]
            isOneToOne: false
            referencedRelation: "wounds"
            referencedColumns: ["id"]
          },
        ]
      }
      billings: {
        Row: {
          cpt_codes: Json
          created_at: string | null
          icd10_codes: Json
          id: string
          modifiers: Json | null
          notes: string | null
          patient_id: string
          time_spent: boolean | null
          updated_at: string | null
          visit_id: string
        }
        Insert: {
          cpt_codes: Json
          created_at?: string | null
          icd10_codes: Json
          id?: string
          modifiers?: Json | null
          notes?: string | null
          patient_id: string
          time_spent?: boolean | null
          updated_at?: string | null
          visit_id: string
        }
        Update: {
          cpt_codes?: Json
          created_at?: string | null
          icd10_codes?: Json
          id?: string
          modifiers?: Json | null
          notes?: string | null
          patient_id?: string
          time_spent?: boolean | null
          updated_at?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          tenant_id: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grafting_assessments: {
        Row: {
          activity_restrictions: string | null
          bathing_instructions: string | null
          complications: string | null
          created_at: string | null
          created_by: string
          donor_site: string | null
          donor_site_condition: string | null
          donor_site_dressing: string | null
          donor_site_notes: string | null
          donor_site_size_length: number | null
          donor_site_size_width: number | null
          dressing_change_frequency: string | null
          elevation_instructions: string | null
          facility_id: string
          fixation_details: string | null
          fixation_method: string | null
          follow_up_plan: string | null
          graft_adherence_notes: string | null
          graft_adherence_percent: number | null
          graft_color: string | null
          graft_dressing_intact: boolean | null
          graft_dressing_type: string | null
          graft_location: string
          graft_necrosis: boolean | null
          graft_separation: boolean | null
          graft_size_area: number | null
          graft_size_length: number | null
          graft_size_width: number | null
          graft_texture: string | null
          graft_type: string
          graft_viable: boolean | null
          has_blistering: boolean | null
          has_hematoma: boolean | null
          has_seroma: boolean | null
          id: string
          infection_signs: string[] | null
          interventions_performed: string | null
          mesh_ratio: string | null
          moisture_management: string | null
          necrosis_percent: number | null
          next_dressing_change_date: string | null
          overall_assessment: string | null
          patient_education_provided: string | null
          patient_id: string
          postop_day: number | null
          postop_instructions: string | null
          procedure_date: string
          procedure_type: string
          provider_notes: string | null
          signs_of_infection: boolean | null
          signs_of_rejection: boolean | null
          sutures_removal_date: string | null
          sutures_removed: boolean | null
          topical_treatment: string | null
          updated_at: string | null
          visit_id: string
          weight_bearing_status: string | null
        }
        Insert: {
          activity_restrictions?: string | null
          bathing_instructions?: string | null
          complications?: string | null
          created_at?: string | null
          created_by: string
          donor_site?: string | null
          donor_site_condition?: string | null
          donor_site_dressing?: string | null
          donor_site_notes?: string | null
          donor_site_size_length?: number | null
          donor_site_size_width?: number | null
          dressing_change_frequency?: string | null
          elevation_instructions?: string | null
          facility_id: string
          fixation_details?: string | null
          fixation_method?: string | null
          follow_up_plan?: string | null
          graft_adherence_notes?: string | null
          graft_adherence_percent?: number | null
          graft_color?: string | null
          graft_dressing_intact?: boolean | null
          graft_dressing_type?: string | null
          graft_location: string
          graft_necrosis?: boolean | null
          graft_separation?: boolean | null
          graft_size_area?: number | null
          graft_size_length?: number | null
          graft_size_width?: number | null
          graft_texture?: string | null
          graft_type: string
          graft_viable?: boolean | null
          has_blistering?: boolean | null
          has_hematoma?: boolean | null
          has_seroma?: boolean | null
          id?: string
          infection_signs?: string[] | null
          interventions_performed?: string | null
          mesh_ratio?: string | null
          moisture_management?: string | null
          necrosis_percent?: number | null
          next_dressing_change_date?: string | null
          overall_assessment?: string | null
          patient_education_provided?: string | null
          patient_id: string
          postop_day?: number | null
          postop_instructions?: string | null
          procedure_date: string
          procedure_type: string
          provider_notes?: string | null
          signs_of_infection?: boolean | null
          signs_of_rejection?: boolean | null
          sutures_removal_date?: string | null
          sutures_removed?: boolean | null
          topical_treatment?: string | null
          updated_at?: string | null
          visit_id: string
          weight_bearing_status?: string | null
        }
        Update: {
          activity_restrictions?: string | null
          bathing_instructions?: string | null
          complications?: string | null
          created_at?: string | null
          created_by?: string
          donor_site?: string | null
          donor_site_condition?: string | null
          donor_site_dressing?: string | null
          donor_site_notes?: string | null
          donor_site_size_length?: number | null
          donor_site_size_width?: number | null
          dressing_change_frequency?: string | null
          elevation_instructions?: string | null
          facility_id?: string
          fixation_details?: string | null
          fixation_method?: string | null
          follow_up_plan?: string | null
          graft_adherence_notes?: string | null
          graft_adherence_percent?: number | null
          graft_color?: string | null
          graft_dressing_intact?: boolean | null
          graft_dressing_type?: string | null
          graft_location?: string
          graft_necrosis?: boolean | null
          graft_separation?: boolean | null
          graft_size_area?: number | null
          graft_size_length?: number | null
          graft_size_width?: number | null
          graft_texture?: string | null
          graft_type?: string
          graft_viable?: boolean | null
          has_blistering?: boolean | null
          has_hematoma?: boolean | null
          has_seroma?: boolean | null
          id?: string
          infection_signs?: string[] | null
          interventions_performed?: string | null
          mesh_ratio?: string | null
          moisture_management?: string | null
          necrosis_percent?: number | null
          next_dressing_change_date?: string | null
          overall_assessment?: string | null
          patient_education_provided?: string | null
          patient_id?: string
          postop_day?: number | null
          postop_instructions?: string | null
          procedure_date?: string
          procedure_type?: string
          provider_notes?: string | null
          signs_of_infection?: boolean | null
          signs_of_rejection?: boolean | null
          sutures_removal_date?: string | null
          sutures_removed?: boolean | null
          topical_treatment?: string | null
          updated_at?: string | null
          visit_id?: string
          weight_bearing_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grafting_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grafting_assessments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grafting_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grafting_assessments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      gtube_procedures: {
        Row: {
          abdomen_distended: boolean | null
          abdomen_non_distended: boolean | null
          abdomen_nontender: boolean | null
          abdomen_other: string | null
          abdomen_soft: boolean | null
          abdomen_tender: boolean | null
          analgesia_used: string | null
          balloon_inflation: string | null
          comments: string | null
          comorbidity_anemia: string | null
          comorbidity_atherosclerosis: boolean | null
          comorbidity_contracture: boolean | null
          comorbidity_cva: boolean | null
          comorbidity_diabetes: boolean | null
          comorbidity_dysphagia: boolean | null
          comorbidity_encephalopathy: boolean | null
          comorbidity_htn: boolean | null
          comorbidity_hypermobility: boolean | null
          comorbidity_inanition: boolean | null
          comorbidity_limited_mobility: boolean | null
          comorbidity_neuropathy: boolean | null
          comorbidity_obesity: boolean | null
          comorbidity_resp_failure: boolean | null
          comorbidity_weakness: boolean | null
          consent_obtained: boolean | null
          consent_previously_obtained: boolean | null
          created_at: string | null
          created_by: string
          discussion: string | null
          dressing_order: string | null
          facility_id: string
          feeding_restart_instructions: string | null
          id: string
          is_draft: boolean | null
          is_new_patient: boolean | null
          last_gtube_placed_date: string | null
          patient_id: string
          peritube_bleeding: boolean | null
          peritube_erythema: boolean | null
          peritube_hypergranulation: boolean | null
          peritube_leakage: boolean | null
          peritube_other: string | null
          peritube_purulence: boolean | null
          peritube_tenderness: boolean | null
          peritube_ulceration: boolean | null
          placement_resistance: string | null
          post_procedure_bleeding: boolean | null
          procedure_date: string
          procedure_dc_removal: boolean | null
          procedure_emergent_replacement_contrast: boolean | null
          procedure_emergent_replacement_no_contrast: boolean | null
          procedure_other: string | null
          procedure_replacement_contrast: boolean | null
          procedure_replacement_no_contrast: boolean | null
          provider: string | null
          reason_damage_malfunction: boolean | null
          reason_deterioration_age: boolean | null
          reason_dislodgement: boolean | null
          reason_infection: boolean | null
          reason_leakage: boolean | null
          reason_obstruction: boolean | null
          reason_other: string | null
          removal_bleeding: string | null
          removal_resistance: string | null
          replacement_tube_balloon: boolean | null
          replacement_tube_balloon_capacity_cc: number | null
          replacement_tube_other_type: string | null
          replacement_tube_size_fr: number | null
          site_cleansing: string | null
          snf_bed_room: string | null
          submitted_at: string | null
          to_pmd: string | null
          tolerated_well: boolean | null
          tube_type_balloon: boolean | null
          tube_type_other: string | null
          tube_type_peg: boolean | null
          updated_at: string | null
          urgent_consent_reason: string | null
          verification_auscultation: boolean | null
          verification_gastrografin: boolean | null
          verification_other: string | null
          verification_xray: boolean | null
          wait_for_radiology: boolean | null
        }
        Insert: {
          abdomen_distended?: boolean | null
          abdomen_non_distended?: boolean | null
          abdomen_nontender?: boolean | null
          abdomen_other?: string | null
          abdomen_soft?: boolean | null
          abdomen_tender?: boolean | null
          analgesia_used?: string | null
          balloon_inflation?: string | null
          comments?: string | null
          comorbidity_anemia?: string | null
          comorbidity_atherosclerosis?: boolean | null
          comorbidity_contracture?: boolean | null
          comorbidity_cva?: boolean | null
          comorbidity_diabetes?: boolean | null
          comorbidity_dysphagia?: boolean | null
          comorbidity_encephalopathy?: boolean | null
          comorbidity_htn?: boolean | null
          comorbidity_hypermobility?: boolean | null
          comorbidity_inanition?: boolean | null
          comorbidity_limited_mobility?: boolean | null
          comorbidity_neuropathy?: boolean | null
          comorbidity_obesity?: boolean | null
          comorbidity_resp_failure?: boolean | null
          comorbidity_weakness?: boolean | null
          consent_obtained?: boolean | null
          consent_previously_obtained?: boolean | null
          created_at?: string | null
          created_by: string
          discussion?: string | null
          dressing_order?: string | null
          facility_id: string
          feeding_restart_instructions?: string | null
          id?: string
          is_draft?: boolean | null
          is_new_patient?: boolean | null
          last_gtube_placed_date?: string | null
          patient_id: string
          peritube_bleeding?: boolean | null
          peritube_erythema?: boolean | null
          peritube_hypergranulation?: boolean | null
          peritube_leakage?: boolean | null
          peritube_other?: string | null
          peritube_purulence?: boolean | null
          peritube_tenderness?: boolean | null
          peritube_ulceration?: boolean | null
          placement_resistance?: string | null
          post_procedure_bleeding?: boolean | null
          procedure_date: string
          procedure_dc_removal?: boolean | null
          procedure_emergent_replacement_contrast?: boolean | null
          procedure_emergent_replacement_no_contrast?: boolean | null
          procedure_other?: string | null
          procedure_replacement_contrast?: boolean | null
          procedure_replacement_no_contrast?: boolean | null
          provider?: string | null
          reason_damage_malfunction?: boolean | null
          reason_deterioration_age?: boolean | null
          reason_dislodgement?: boolean | null
          reason_infection?: boolean | null
          reason_leakage?: boolean | null
          reason_obstruction?: boolean | null
          reason_other?: string | null
          removal_bleeding?: string | null
          removal_resistance?: string | null
          replacement_tube_balloon?: boolean | null
          replacement_tube_balloon_capacity_cc?: number | null
          replacement_tube_other_type?: string | null
          replacement_tube_size_fr?: number | null
          site_cleansing?: string | null
          snf_bed_room?: string | null
          submitted_at?: string | null
          to_pmd?: string | null
          tolerated_well?: boolean | null
          tube_type_balloon?: boolean | null
          tube_type_other?: string | null
          tube_type_peg?: boolean | null
          updated_at?: string | null
          urgent_consent_reason?: string | null
          verification_auscultation?: boolean | null
          verification_gastrografin?: boolean | null
          verification_other?: string | null
          verification_xray?: boolean | null
          wait_for_radiology?: boolean | null
        }
        Update: {
          abdomen_distended?: boolean | null
          abdomen_non_distended?: boolean | null
          abdomen_nontender?: boolean | null
          abdomen_other?: string | null
          abdomen_soft?: boolean | null
          abdomen_tender?: boolean | null
          analgesia_used?: string | null
          balloon_inflation?: string | null
          comments?: string | null
          comorbidity_anemia?: string | null
          comorbidity_atherosclerosis?: boolean | null
          comorbidity_contracture?: boolean | null
          comorbidity_cva?: boolean | null
          comorbidity_diabetes?: boolean | null
          comorbidity_dysphagia?: boolean | null
          comorbidity_encephalopathy?: boolean | null
          comorbidity_htn?: boolean | null
          comorbidity_hypermobility?: boolean | null
          comorbidity_inanition?: boolean | null
          comorbidity_limited_mobility?: boolean | null
          comorbidity_neuropathy?: boolean | null
          comorbidity_obesity?: boolean | null
          comorbidity_resp_failure?: boolean | null
          comorbidity_weakness?: boolean | null
          consent_obtained?: boolean | null
          consent_previously_obtained?: boolean | null
          created_at?: string | null
          created_by?: string
          discussion?: string | null
          dressing_order?: string | null
          facility_id?: string
          feeding_restart_instructions?: string | null
          id?: string
          is_draft?: boolean | null
          is_new_patient?: boolean | null
          last_gtube_placed_date?: string | null
          patient_id?: string
          peritube_bleeding?: boolean | null
          peritube_erythema?: boolean | null
          peritube_hypergranulation?: boolean | null
          peritube_leakage?: boolean | null
          peritube_other?: string | null
          peritube_purulence?: boolean | null
          peritube_tenderness?: boolean | null
          peritube_ulceration?: boolean | null
          placement_resistance?: string | null
          post_procedure_bleeding?: boolean | null
          procedure_date?: string
          procedure_dc_removal?: boolean | null
          procedure_emergent_replacement_contrast?: boolean | null
          procedure_emergent_replacement_no_contrast?: boolean | null
          procedure_other?: string | null
          procedure_replacement_contrast?: boolean | null
          procedure_replacement_no_contrast?: boolean | null
          provider?: string | null
          reason_damage_malfunction?: boolean | null
          reason_deterioration_age?: boolean | null
          reason_dislodgement?: boolean | null
          reason_infection?: boolean | null
          reason_leakage?: boolean | null
          reason_obstruction?: boolean | null
          reason_other?: string | null
          removal_bleeding?: string | null
          removal_resistance?: string | null
          replacement_tube_balloon?: boolean | null
          replacement_tube_balloon_capacity_cc?: number | null
          replacement_tube_other_type?: string | null
          replacement_tube_size_fr?: number | null
          site_cleansing?: string | null
          snf_bed_room?: string | null
          submitted_at?: string | null
          to_pmd?: string | null
          tolerated_well?: boolean | null
          tube_type_balloon?: boolean | null
          tube_type_other?: string | null
          tube_type_peg?: boolean | null
          updated_at?: string | null
          urgent_consent_reason?: string | null
          verification_auscultation?: boolean | null
          verification_gastrografin?: boolean | null
          verification_other?: string | null
          verification_xray?: boolean | null
          wait_for_radiology?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gtube_procedures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtube_procedures_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtube_procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinicians: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          patient_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          patient_id: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          patient_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinicians_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          consent_document_name: string | null
          consent_document_size: number | null
          consent_document_url: string | null
          consent_text: string
          consent_type: string
          consented_at: string
          created_at: string | null
          created_by: string | null
          id: string
          patient_id: string
          patient_signature_id: string | null
          witness_signature_id: string | null
        }
        Insert: {
          consent_document_name?: string | null
          consent_document_size?: number | null
          consent_document_url?: string | null
          consent_text: string
          consent_type?: string
          consented_at?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          patient_id: string
          patient_signature_id?: string | null
          witness_signature_id?: string | null
        }
        Update: {
          consent_document_name?: string | null
          consent_document_size?: number | null
          consent_document_url?: string | null
          consent_text?: string
          consent_type?: string
          consented_at?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          patient_id?: string
          patient_signature_id?: string | null
          witness_signature_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_signature_id_fkey"
            columns: ["patient_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_witness_signature_id_fkey"
            columns: ["witness_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          document_category: string | null
          document_date: string | null
          document_name: string
          document_type: string
          file_size: number
          id: string
          is_archived: boolean
          mime_type: string
          notes: string | null
          patient_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          document_category?: string | null
          document_date?: string | null
          document_name: string
          document_type: string
          file_size: number
          id?: string
          is_archived?: boolean
          mime_type: string
          notes?: string | null
          patient_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          document_category?: string | null
          document_date?: string | null
          document_name?: string
          document_type?: string
          file_size?: number
          id?: string
          is_archived?: boolean
          mime_type?: string
          notes?: string | null
          patient_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: Json | null
          city: string | null
          created_at: string | null
          created_by: string
          dob: string
          email: string | null
          emergency_contact: Json | null
          facility_id: string
          first_name: string
          gender: string | null
          id: string
          insurance_info: Json | null
          is_active: boolean | null
          last_name: string
          medical_history: Json | null
          mrn: string
          phone: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          allergies?: Json | null
          city?: string | null
          created_at?: string | null
          created_by: string
          dob: string
          email?: string | null
          emergency_contact?: Json | null
          facility_id: string
          first_name: string
          gender?: string | null
          id?: string
          insurance_info?: Json | null
          is_active?: boolean | null
          last_name: string
          medical_history?: Json | null
          mrn: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          allergies?: Json | null
          city?: string | null
          created_at?: string | null
          created_by?: string
          dob?: string
          email?: string | null
          emergency_contact?: Json | null
          facility_id?: string
          first_name?: string
          gender?: string | null
          id?: string
          insurance_info?: Json | null
          is_active?: boolean | null
          last_name?: string
          medical_history?: Json | null
          mrn?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          assessment_id: string | null
          caption: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          thumbnail_url: string | null
          uploaded_at: string | null
          uploaded_by: string
          url: string
          visit_id: string | null
          wound_id: string
        }
        Insert: {
          assessment_id?: string | null
          caption?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          thumbnail_url?: string | null
          uploaded_at?: string | null
          uploaded_by: string
          url: string
          visit_id?: string | null
          wound_id: string
        }
        Update: {
          assessment_id?: string | null
          caption?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          thumbnail_url?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
          url?: string
          visit_id?: string | null
          wound_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_wound_id_fkey"
            columns: ["wound_id"]
            isOneToOne: false
            referencedRelation: "wounds"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_scopes: {
        Row: {
          allowed_credentials: string[]
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          procedure_code: string
          procedure_name: string
          updated_at: string | null
        }
        Insert: {
          allowed_credentials: string[]
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          procedure_code: string
          procedure_name: string
          updated_at?: string | null
        }
        Update: {
          allowed_credentials?: string[]
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          procedure_code?: string
          procedure_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          ip_address: string | null
          patient_id: string | null
          signature_data: string
          signature_method: string
          signature_type: string
          signed_at: string
          signer_name: string
          signer_role: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ip_address?: string | null
          patient_id?: string | null
          signature_data: string
          signature_method: string
          signature_type: string
          signed_at?: string
          signer_name: string
          signer_role?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ip_address?: string | null
          patient_id?: string | null
          signature_data?: string
          signature_method?: string
          signature_type?: string
          signed_at?: string
          signer_name?: string
          signer_role?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      skilled_nursing_assessments: {
        Row: {
          adequate_intake: boolean | null
          agitated: boolean | null
          ambulation_difficulty: boolean | null
          anxiety: boolean | null
          assessment_date: string
          balance_issues: boolean | null
          bedbound: boolean | null
          blood_sugar: number | null
          bowel_sounds: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          cap_refill_under_3sec: boolean | null
          cardiovascular_wnl: boolean | null
          catheter_balloon_cc: number | null
          catheter_last_changed: string | null
          catheter_size_fr: number | null
          catheter_type: string | null
          chairbound: boolean | null
          chest_pain: boolean | null
          chewing_swallowing_issues: boolean | null
          contracture: boolean | null
          cough_productive: boolean | null
          created_at: string | null
          created_by: string
          decreased_appetite: boolean | null
          decreased_sensation: string | null
          dental_problems: string | null
          dentures: boolean | null
          depressed_mood: boolean | null
          disoriented: boolean | null
          dizziness: boolean | null
          dysphagia: boolean | null
          edema_grade: string | null
          education_given: string | null
          education_source: string | null
          external_genitalia_normal: boolean | null
          external_genitalia_notes: string | null
          facility_id: string
          forgetful: boolean | null
          gi_constipation: string | null
          gi_diarrhea: boolean | null
          gi_incontinence: boolean | null
          gi_nausea_vomiting: boolean | null
          gi_npo: boolean | null
          gi_reflux: boolean | null
          gi_wnl: boolean | null
          grip_strength_equal: boolean | null
          gu_burning: boolean | null
          gu_distention: boolean | null
          gu_dysuria: boolean | null
          gu_frequency: boolean | null
          gu_incontinence: boolean | null
          gu_retention: boolean | null
          gu_urgency: boolean | null
          gu_urostomy: string | null
          gu_wnl: boolean | null
          has_cough: boolean | null
          has_edema: boolean | null
          has_ostomy: boolean | null
          has_pain: boolean | null
          has_seizures: boolean | null
          has_sputum: boolean | null
          hearing_deaf: boolean | null
          hearing_impaired_left: boolean | null
          hearing_impaired_right: boolean | null
          heart_click: boolean | null
          heart_gallop: boolean | null
          heart_irregular: boolean | null
          heart_murmur: boolean | null
          heart_rate: number | null
          id: string
          impaired_decision_making: boolean | null
          inappropriate_behavior: boolean | null
          integumentary_wnl: boolean | null
          irritability: boolean | null
          is_draft: boolean | null
          joint_pain: boolean | null
          last_bm: string | null
          lethargic: boolean | null
          limited_mobility: string | null
          lung_sounds_absent: boolean | null
          lung_sounds_crackles: boolean | null
          lung_sounds_cta: boolean | null
          lung_sounds_diminished: boolean | null
          lung_sounds_rales: boolean | null
          lung_sounds_rhonchi: boolean | null
          lung_sounds_stridor: boolean | null
          lung_sounds_wheezes: boolean | null
          md_notification: string | null
          meals_prepared_appropriately: boolean | null
          med_changes_since_last_visit: boolean | null
          med_compliant: boolean | null
          medication_notes: string | null
          musculoskeletal_wnl: boolean | null
          nebulizer_time: string | null
          nebulizer_type: string | null
          neck_vein_distention: boolean | null
          nutrition_wnl: boolean | null
          on_nebulizer: boolean | null
          on_oxygen: boolean | null
          oriented_person: boolean | null
          oriented_place: boolean | null
          oriented_time: boolean | null
          ostomy_stoma_appearance: string | null
          ostomy_stool_appearance: string | null
          ostomy_surrounding_skin: string | null
          oxygen_lpm: number | null
          oxygen_saturation: number | null
          pain_aggravating_factors: string | null
          pain_location: string | null
          pain_management: string | null
          pain_quality: string | null
          pain_scale: number | null
          paralysis: boolean | null
          patient_id: string
          peripheral_pulses: string | null
          perrl: boolean | null
          poor_coping_skills: boolean | null
          poor_home_environment: boolean | null
          problems_issues: string | null
          respiratory_rate: number | null
          sensory_wnl: boolean | null
          skin_clammy: boolean | null
          skin_cool: boolean | null
          skin_dry: boolean | null
          skin_pallor: boolean | null
          skin_turgor: string | null
          skin_warm: boolean | null
          speech_impaired: boolean | null
          sputum_description: string | null
          stool_black: boolean | null
          stool_fresh_blood: boolean | null
          stool_gray: boolean | null
          stool_tarry: boolean | null
          stool_wnl: boolean | null
          submitted_at: string | null
          temp: number | null
          tube_feeding: boolean | null
          tube_feeding_formula: string | null
          tube_feeding_method: string | null
          tube_feeding_placement_checked: boolean | null
          tube_feeding_rate_cc_hr: number | null
          tube_feeding_type: string | null
          updated_at: string | null
          urine_cloudy: boolean | null
          urine_hematuria: boolean | null
          urine_odorous: boolean | null
          urine_other: string | null
          urine_sediment: boolean | null
          vision_blind: boolean | null
          vision_blurred: boolean | null
          vision_cataracts: boolean | null
          vision_contacts: boolean | null
          vision_glasses: boolean | null
          vision_glaucoma: boolean | null
          vision_macular_degeneration: boolean | null
          vision_wnl: boolean | null
          visit_id: string
          weakness: boolean | null
          weight_change: string | null
        }
        Insert: {
          adequate_intake?: boolean | null
          agitated?: boolean | null
          ambulation_difficulty?: boolean | null
          anxiety?: boolean | null
          assessment_date: string
          balance_issues?: boolean | null
          bedbound?: boolean | null
          blood_sugar?: number | null
          bowel_sounds?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          cap_refill_under_3sec?: boolean | null
          cardiovascular_wnl?: boolean | null
          catheter_balloon_cc?: number | null
          catheter_last_changed?: string | null
          catheter_size_fr?: number | null
          catheter_type?: string | null
          chairbound?: boolean | null
          chest_pain?: boolean | null
          chewing_swallowing_issues?: boolean | null
          contracture?: boolean | null
          cough_productive?: boolean | null
          created_at?: string | null
          created_by: string
          decreased_appetite?: boolean | null
          decreased_sensation?: string | null
          dental_problems?: string | null
          dentures?: boolean | null
          depressed_mood?: boolean | null
          disoriented?: boolean | null
          dizziness?: boolean | null
          dysphagia?: boolean | null
          edema_grade?: string | null
          education_given?: string | null
          education_source?: string | null
          external_genitalia_normal?: boolean | null
          external_genitalia_notes?: string | null
          facility_id: string
          forgetful?: boolean | null
          gi_constipation?: string | null
          gi_diarrhea?: boolean | null
          gi_incontinence?: boolean | null
          gi_nausea_vomiting?: boolean | null
          gi_npo?: boolean | null
          gi_reflux?: boolean | null
          gi_wnl?: boolean | null
          grip_strength_equal?: boolean | null
          gu_burning?: boolean | null
          gu_distention?: boolean | null
          gu_dysuria?: boolean | null
          gu_frequency?: boolean | null
          gu_incontinence?: boolean | null
          gu_retention?: boolean | null
          gu_urgency?: boolean | null
          gu_urostomy?: string | null
          gu_wnl?: boolean | null
          has_cough?: boolean | null
          has_edema?: boolean | null
          has_ostomy?: boolean | null
          has_pain?: boolean | null
          has_seizures?: boolean | null
          has_sputum?: boolean | null
          hearing_deaf?: boolean | null
          hearing_impaired_left?: boolean | null
          hearing_impaired_right?: boolean | null
          heart_click?: boolean | null
          heart_gallop?: boolean | null
          heart_irregular?: boolean | null
          heart_murmur?: boolean | null
          heart_rate?: number | null
          id?: string
          impaired_decision_making?: boolean | null
          inappropriate_behavior?: boolean | null
          integumentary_wnl?: boolean | null
          irritability?: boolean | null
          is_draft?: boolean | null
          joint_pain?: boolean | null
          last_bm?: string | null
          lethargic?: boolean | null
          limited_mobility?: string | null
          lung_sounds_absent?: boolean | null
          lung_sounds_crackles?: boolean | null
          lung_sounds_cta?: boolean | null
          lung_sounds_diminished?: boolean | null
          lung_sounds_rales?: boolean | null
          lung_sounds_rhonchi?: boolean | null
          lung_sounds_stridor?: boolean | null
          lung_sounds_wheezes?: boolean | null
          md_notification?: string | null
          meals_prepared_appropriately?: boolean | null
          med_changes_since_last_visit?: boolean | null
          med_compliant?: boolean | null
          medication_notes?: string | null
          musculoskeletal_wnl?: boolean | null
          nebulizer_time?: string | null
          nebulizer_type?: string | null
          neck_vein_distention?: boolean | null
          nutrition_wnl?: boolean | null
          on_nebulizer?: boolean | null
          on_oxygen?: boolean | null
          oriented_person?: boolean | null
          oriented_place?: boolean | null
          oriented_time?: boolean | null
          ostomy_stoma_appearance?: string | null
          ostomy_stool_appearance?: string | null
          ostomy_surrounding_skin?: string | null
          oxygen_lpm?: number | null
          oxygen_saturation?: number | null
          pain_aggravating_factors?: string | null
          pain_location?: string | null
          pain_management?: string | null
          pain_quality?: string | null
          pain_scale?: number | null
          paralysis?: boolean | null
          patient_id: string
          peripheral_pulses?: string | null
          perrl?: boolean | null
          poor_coping_skills?: boolean | null
          poor_home_environment?: boolean | null
          problems_issues?: string | null
          respiratory_rate?: number | null
          sensory_wnl?: boolean | null
          skin_clammy?: boolean | null
          skin_cool?: boolean | null
          skin_dry?: boolean | null
          skin_pallor?: boolean | null
          skin_turgor?: string | null
          skin_warm?: boolean | null
          speech_impaired?: boolean | null
          sputum_description?: string | null
          stool_black?: boolean | null
          stool_fresh_blood?: boolean | null
          stool_gray?: boolean | null
          stool_tarry?: boolean | null
          stool_wnl?: boolean | null
          submitted_at?: string | null
          temp?: number | null
          tube_feeding?: boolean | null
          tube_feeding_formula?: string | null
          tube_feeding_method?: string | null
          tube_feeding_placement_checked?: boolean | null
          tube_feeding_rate_cc_hr?: number | null
          tube_feeding_type?: string | null
          updated_at?: string | null
          urine_cloudy?: boolean | null
          urine_hematuria?: boolean | null
          urine_odorous?: boolean | null
          urine_other?: string | null
          urine_sediment?: boolean | null
          vision_blind?: boolean | null
          vision_blurred?: boolean | null
          vision_cataracts?: boolean | null
          vision_contacts?: boolean | null
          vision_glasses?: boolean | null
          vision_glaucoma?: boolean | null
          vision_macular_degeneration?: boolean | null
          vision_wnl?: boolean | null
          visit_id: string
          weakness?: boolean | null
          weight_change?: string | null
        }
        Update: {
          adequate_intake?: boolean | null
          agitated?: boolean | null
          ambulation_difficulty?: boolean | null
          anxiety?: boolean | null
          assessment_date?: string
          balance_issues?: boolean | null
          bedbound?: boolean | null
          blood_sugar?: number | null
          bowel_sounds?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          cap_refill_under_3sec?: boolean | null
          cardiovascular_wnl?: boolean | null
          catheter_balloon_cc?: number | null
          catheter_last_changed?: string | null
          catheter_size_fr?: number | null
          catheter_type?: string | null
          chairbound?: boolean | null
          chest_pain?: boolean | null
          chewing_swallowing_issues?: boolean | null
          contracture?: boolean | null
          cough_productive?: boolean | null
          created_at?: string | null
          created_by?: string
          decreased_appetite?: boolean | null
          decreased_sensation?: string | null
          dental_problems?: string | null
          dentures?: boolean | null
          depressed_mood?: boolean | null
          disoriented?: boolean | null
          dizziness?: boolean | null
          dysphagia?: boolean | null
          edema_grade?: string | null
          education_given?: string | null
          education_source?: string | null
          external_genitalia_normal?: boolean | null
          external_genitalia_notes?: string | null
          facility_id?: string
          forgetful?: boolean | null
          gi_constipation?: string | null
          gi_diarrhea?: boolean | null
          gi_incontinence?: boolean | null
          gi_nausea_vomiting?: boolean | null
          gi_npo?: boolean | null
          gi_reflux?: boolean | null
          gi_wnl?: boolean | null
          grip_strength_equal?: boolean | null
          gu_burning?: boolean | null
          gu_distention?: boolean | null
          gu_dysuria?: boolean | null
          gu_frequency?: boolean | null
          gu_incontinence?: boolean | null
          gu_retention?: boolean | null
          gu_urgency?: boolean | null
          gu_urostomy?: string | null
          gu_wnl?: boolean | null
          has_cough?: boolean | null
          has_edema?: boolean | null
          has_ostomy?: boolean | null
          has_pain?: boolean | null
          has_seizures?: boolean | null
          has_sputum?: boolean | null
          hearing_deaf?: boolean | null
          hearing_impaired_left?: boolean | null
          hearing_impaired_right?: boolean | null
          heart_click?: boolean | null
          heart_gallop?: boolean | null
          heart_irregular?: boolean | null
          heart_murmur?: boolean | null
          heart_rate?: number | null
          id?: string
          impaired_decision_making?: boolean | null
          inappropriate_behavior?: boolean | null
          integumentary_wnl?: boolean | null
          irritability?: boolean | null
          is_draft?: boolean | null
          joint_pain?: boolean | null
          last_bm?: string | null
          lethargic?: boolean | null
          limited_mobility?: string | null
          lung_sounds_absent?: boolean | null
          lung_sounds_crackles?: boolean | null
          lung_sounds_cta?: boolean | null
          lung_sounds_diminished?: boolean | null
          lung_sounds_rales?: boolean | null
          lung_sounds_rhonchi?: boolean | null
          lung_sounds_stridor?: boolean | null
          lung_sounds_wheezes?: boolean | null
          md_notification?: string | null
          meals_prepared_appropriately?: boolean | null
          med_changes_since_last_visit?: boolean | null
          med_compliant?: boolean | null
          medication_notes?: string | null
          musculoskeletal_wnl?: boolean | null
          nebulizer_time?: string | null
          nebulizer_type?: string | null
          neck_vein_distention?: boolean | null
          nutrition_wnl?: boolean | null
          on_nebulizer?: boolean | null
          on_oxygen?: boolean | null
          oriented_person?: boolean | null
          oriented_place?: boolean | null
          oriented_time?: boolean | null
          ostomy_stoma_appearance?: string | null
          ostomy_stool_appearance?: string | null
          ostomy_surrounding_skin?: string | null
          oxygen_lpm?: number | null
          oxygen_saturation?: number | null
          pain_aggravating_factors?: string | null
          pain_location?: string | null
          pain_management?: string | null
          pain_quality?: string | null
          pain_scale?: number | null
          paralysis?: boolean | null
          patient_id?: string
          peripheral_pulses?: string | null
          perrl?: boolean | null
          poor_coping_skills?: boolean | null
          poor_home_environment?: boolean | null
          problems_issues?: string | null
          respiratory_rate?: number | null
          sensory_wnl?: boolean | null
          skin_clammy?: boolean | null
          skin_cool?: boolean | null
          skin_dry?: boolean | null
          skin_pallor?: boolean | null
          skin_turgor?: string | null
          skin_warm?: boolean | null
          speech_impaired?: boolean | null
          sputum_description?: string | null
          stool_black?: boolean | null
          stool_fresh_blood?: boolean | null
          stool_gray?: boolean | null
          stool_tarry?: boolean | null
          stool_wnl?: boolean | null
          submitted_at?: string | null
          temp?: number | null
          tube_feeding?: boolean | null
          tube_feeding_formula?: string | null
          tube_feeding_method?: string | null
          tube_feeding_placement_checked?: boolean | null
          tube_feeding_rate_cc_hr?: number | null
          tube_feeding_type?: string | null
          updated_at?: string | null
          urine_cloudy?: boolean | null
          urine_hematuria?: boolean | null
          urine_odorous?: boolean | null
          urine_other?: string | null
          urine_sediment?: boolean | null
          vision_blind?: boolean | null
          vision_blurred?: boolean | null
          vision_cataracts?: boolean | null
          vision_contacts?: boolean | null
          vision_glasses?: boolean | null
          vision_glaucoma?: boolean | null
          vision_macular_degeneration?: boolean | null
          vision_wnl?: boolean | null
          visit_id?: string
          weakness?: boolean | null
          weight_change?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skilled_nursing_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skilled_nursing_assessments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skilled_nursing_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skilled_nursing_assessments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      skilled_nursing_wounds: {
        Row: {
          assessment_id: string
          comments: string | null
          created_at: string | null
          diagram_x: number | null
          diagram_y: number | null
          drainage: string | null
          etiology: string | null
          has_inflammation: boolean | null
          has_undermining: boolean | null
          id: string
          location: string
          odor: string | null
          onset_date: string | null
          photo_obtained: boolean | null
          size: string | null
          stage: string | null
          treatment: string | null
          updated_at: string | null
          visit_id: string
          wound_id: string | null
        }
        Insert: {
          assessment_id: string
          comments?: string | null
          created_at?: string | null
          diagram_x?: number | null
          diagram_y?: number | null
          drainage?: string | null
          etiology?: string | null
          has_inflammation?: boolean | null
          has_undermining?: boolean | null
          id?: string
          location: string
          odor?: string | null
          onset_date?: string | null
          photo_obtained?: boolean | null
          size?: string | null
          stage?: string | null
          treatment?: string | null
          updated_at?: string | null
          visit_id: string
          wound_id?: string | null
        }
        Update: {
          assessment_id?: string
          comments?: string | null
          created_at?: string | null
          diagram_x?: number | null
          diagram_y?: number | null
          drainage?: string | null
          etiology?: string | null
          has_inflammation?: boolean | null
          has_undermining?: boolean | null
          id?: string
          location?: string
          odor?: string | null
          onset_date?: string | null
          photo_obtained?: boolean | null
          size?: string | null
          stage?: string | null
          treatment?: string | null
          updated_at?: string | null
          visit_id?: string
          wound_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skilled_nursing_wounds_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skilled_nursing_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skilled_nursing_wounds_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skilled_nursing_wounds_wound_id_fkey"
            columns: ["wound_id"]
            isOneToOne: false
            referencedRelation: "wounds"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_sweep_assessments: {
        Row: {
          areas_inspected: string[]
          assessment_date: string
          assessment_type: string
          at_risk_areas: string[] | null
          at_risk_notes: string | null
          braden_scale_score: number | null
          caregiver_education_provided: boolean | null
          created_at: string | null
          created_by: string
          current_prevention_measures: Json | null
          device_injury_details: string | null
          device_related_injuries: boolean | null
          devices_identified: string[] | null
          education_method: string | null
          education_provided: boolean | null
          education_topics: string[] | null
          equipment_currently_in_use: string[] | null
          equipment_ordered: string[] | null
          equipment_recommendations: string[] | null
          facility_id: string
          follow_up_frequency: string | null
          follow_up_needed: boolean | null
          has_incontinence: boolean | null
          head_neck_findings: string | null
          head_neck_has_wounds: boolean | null
          id: string
          incontinence_type: string | null
          interventions_implemented: string | null
          lower_extremities_findings: string | null
          lower_extremities_has_wounds: boolean | null
          moisture_associated_dermatitis: boolean | null
          new_wounds_documented: number | null
          notes: string | null
          patient_id: string
          patient_understanding: string | null
          perineal_findings: string | null
          perineal_has_wounds: boolean | null
          provider_assessment: string | null
          recommended_prevention_measures: Json | null
          referrals_made: string[] | null
          risk_factors: string[] | null
          risk_level: string | null
          sacral_findings: string | null
          sacral_has_wounds: boolean | null
          significant_findings: string | null
          skin_breakdown_from_moisture: boolean | null
          skin_color: string | null
          skin_condition_overall: string | null
          skin_temperature: string | null
          skin_turgor: string | null
          total_wounds_found: number | null
          trunk_findings: string | null
          trunk_has_wounds: boolean | null
          updated_at: string | null
          upper_extremities_findings: string | null
          upper_extremities_has_wounds: boolean | null
          visit_id: string
          wounds_improved: number | null
          wounds_unchanged: number | null
          wounds_worsened: number | null
        }
        Insert: {
          areas_inspected: string[]
          assessment_date: string
          assessment_type: string
          at_risk_areas?: string[] | null
          at_risk_notes?: string | null
          braden_scale_score?: number | null
          caregiver_education_provided?: boolean | null
          created_at?: string | null
          created_by: string
          current_prevention_measures?: Json | null
          device_injury_details?: string | null
          device_related_injuries?: boolean | null
          devices_identified?: string[] | null
          education_method?: string | null
          education_provided?: boolean | null
          education_topics?: string[] | null
          equipment_currently_in_use?: string[] | null
          equipment_ordered?: string[] | null
          equipment_recommendations?: string[] | null
          facility_id: string
          follow_up_frequency?: string | null
          follow_up_needed?: boolean | null
          has_incontinence?: boolean | null
          head_neck_findings?: string | null
          head_neck_has_wounds?: boolean | null
          id?: string
          incontinence_type?: string | null
          interventions_implemented?: string | null
          lower_extremities_findings?: string | null
          lower_extremities_has_wounds?: boolean | null
          moisture_associated_dermatitis?: boolean | null
          new_wounds_documented?: number | null
          notes?: string | null
          patient_id: string
          patient_understanding?: string | null
          perineal_findings?: string | null
          perineal_has_wounds?: boolean | null
          provider_assessment?: string | null
          recommended_prevention_measures?: Json | null
          referrals_made?: string[] | null
          risk_factors?: string[] | null
          risk_level?: string | null
          sacral_findings?: string | null
          sacral_has_wounds?: boolean | null
          significant_findings?: string | null
          skin_breakdown_from_moisture?: boolean | null
          skin_color?: string | null
          skin_condition_overall?: string | null
          skin_temperature?: string | null
          skin_turgor?: string | null
          total_wounds_found?: number | null
          trunk_findings?: string | null
          trunk_has_wounds?: boolean | null
          updated_at?: string | null
          upper_extremities_findings?: string | null
          upper_extremities_has_wounds?: boolean | null
          visit_id: string
          wounds_improved?: number | null
          wounds_unchanged?: number | null
          wounds_worsened?: number | null
        }
        Update: {
          areas_inspected?: string[]
          assessment_date?: string
          assessment_type?: string
          at_risk_areas?: string[] | null
          at_risk_notes?: string | null
          braden_scale_score?: number | null
          caregiver_education_provided?: boolean | null
          created_at?: string | null
          created_by?: string
          current_prevention_measures?: Json | null
          device_injury_details?: string | null
          device_related_injuries?: boolean | null
          devices_identified?: string[] | null
          education_method?: string | null
          education_provided?: boolean | null
          education_topics?: string[] | null
          equipment_currently_in_use?: string[] | null
          equipment_ordered?: string[] | null
          equipment_recommendations?: string[] | null
          facility_id?: string
          follow_up_frequency?: string | null
          follow_up_needed?: boolean | null
          has_incontinence?: boolean | null
          head_neck_findings?: string | null
          head_neck_has_wounds?: boolean | null
          id?: string
          incontinence_type?: string | null
          interventions_implemented?: string | null
          lower_extremities_findings?: string | null
          lower_extremities_has_wounds?: boolean | null
          moisture_associated_dermatitis?: boolean | null
          new_wounds_documented?: number | null
          notes?: string | null
          patient_id?: string
          patient_understanding?: string | null
          perineal_findings?: string | null
          perineal_has_wounds?: boolean | null
          provider_assessment?: string | null
          recommended_prevention_measures?: Json | null
          referrals_made?: string[] | null
          risk_factors?: string[] | null
          risk_level?: string | null
          sacral_findings?: string | null
          sacral_has_wounds?: boolean | null
          significant_findings?: string | null
          skin_breakdown_from_moisture?: boolean | null
          skin_color?: string | null
          skin_condition_overall?: string | null
          skin_temperature?: string | null
          skin_turgor?: string | null
          total_wounds_found?: number | null
          trunk_findings?: string | null
          trunk_has_wounds?: boolean | null
          updated_at?: string | null
          upper_extremities_findings?: string | null
          upper_extremities_has_wounds?: boolean | null
          visit_id?: string
          wounds_improved?: number | null
          wounds_unchanged?: number | null
          wounds_worsened?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skin_sweep_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_sweep_assessments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_sweep_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_sweep_assessments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subdomain: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subdomain?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subdomain?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      treatments: {
        Row: {
          advanced_therapies: Json | null
          antimicrobials: Json | null
          chair_cushion_type: string | null
          compression: Json | null
          created_at: string | null
          debridement: Json | null
          frequency_days: number | null
          id: string
          moisture_management: Json | null
          npwt_frequency: string | null
          npwt_pressure: number | null
          preventive_orders: Json | null
          primary_dressings: Json | null
          prn: boolean | null
          secondary_dressings: Json | null
          special_instructions: string | null
          treatment_orders: string | null
          updated_at: string | null
          visit_id: string
        }
        Insert: {
          advanced_therapies?: Json | null
          antimicrobials?: Json | null
          chair_cushion_type?: string | null
          compression?: Json | null
          created_at?: string | null
          debridement?: Json | null
          frequency_days?: number | null
          id?: string
          moisture_management?: Json | null
          npwt_frequency?: string | null
          npwt_pressure?: number | null
          preventive_orders?: Json | null
          primary_dressings?: Json | null
          prn?: boolean | null
          secondary_dressings?: Json | null
          special_instructions?: string | null
          treatment_orders?: string | null
          updated_at?: string | null
          visit_id: string
        }
        Update: {
          advanced_therapies?: Json | null
          antimicrobials?: Json | null
          chair_cushion_type?: string | null
          compression?: Json | null
          created_at?: string | null
          debridement?: Json | null
          frequency_days?: number | null
          id?: string
          moisture_management?: Json | null
          npwt_frequency?: string | null
          npwt_pressure?: number | null
          preventive_orders?: Json | null
          primary_dressings?: Json | null
          prn?: boolean | null
          secondary_dressings?: Json | null
          special_instructions?: string | null
          treatment_orders?: string | null
          updated_at?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_facilities: {
        Row: {
          created_at: string | null
          facility_id: string
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          facility_id: string
          id?: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          facility_id?: string
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          credentials: string
          email: string
          expires_at: string
          facility_id: string | null
          id: string
          invite_token: string
          invited_by: string
          role: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          credentials?: string
          email: string
          expires_at: string
          facility_id?: string | null
          id?: string
          invite_token: string
          invited_by: string
          role: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          credentials?: string
          email?: string
          expires_at?: string
          facility_id?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          facility_id: string | null
          id: string
          role: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          facility_id?: string | null
          id?: string
          role: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          facility_id?: string | null
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          credentials: string
          email: string
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          addendum_count: number | null
          additional_notes: string | null
          approved_at: string | null
          approved_by: string | null
          clinician_credentials: string | null
          clinician_id: string | null
          clinician_name: string | null
          correction_notes: Json | null
          created_at: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_type: string | null
          id: string
          location: string | null
          number_of_addenda: number | null
          patient_id: string
          patient_signature_id: string | null
          primary_clinician_id: string | null
          provider_signature_id: string | null
          requires_patient_signature: boolean | null
          sent_to_office_at: string | null
          status: string | null
          time_spent: boolean | null
          updated_at: string | null
          visit_date: string
          visit_type: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          addendum_count?: number | null
          additional_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          clinician_credentials?: string | null
          clinician_id?: string | null
          clinician_name?: string | null
          correction_notes?: Json | null
          created_at?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_type?: string | null
          id?: string
          location?: string | null
          number_of_addenda?: number | null
          patient_id: string
          patient_signature_id?: string | null
          primary_clinician_id?: string | null
          provider_signature_id?: string | null
          requires_patient_signature?: boolean | null
          sent_to_office_at?: string | null
          status?: string | null
          time_spent?: boolean | null
          updated_at?: string | null
          visit_date: string
          visit_type: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          addendum_count?: number | null
          additional_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          clinician_credentials?: string | null
          clinician_id?: string | null
          clinician_name?: string | null
          correction_notes?: Json | null
          created_at?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_type?: string | null
          id?: string
          location?: string | null
          number_of_addenda?: number | null
          patient_id?: string
          patient_signature_id?: string | null
          primary_clinician_id?: string | null
          provider_signature_id?: string | null
          requires_patient_signature?: boolean | null
          sent_to_office_at?: string | null
          status?: string | null
          time_spent?: boolean | null
          updated_at?: string | null
          visit_date?: string
          visit_type?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_signature_fk"
            columns: ["patient_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_provider_signature_fk"
            columns: ["provider_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      wound_notes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          note: string
          note_type: string | null
          updated_at: string | null
          visit_id: string | null
          wound_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          note: string
          note_type?: string | null
          updated_at?: string | null
          visit_id?: string | null
          wound_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          note?: string
          note_type?: string | null
          updated_at?: string | null
          visit_id?: string | null
          wound_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wound_notes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_notes_wound_id_fkey"
            columns: ["wound_id"]
            isOneToOne: false
            referencedRelation: "wounds"
            referencedColumns: ["id"]
          },
        ]
      }
      wounds: {
        Row: {
          created_at: string | null
          id: string
          location: string
          onset_date: string
          patient_id: string
          status: string | null
          updated_at: string | null
          wound_number: string
          wound_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location: string
          onset_date: string
          patient_id: string
          status?: string | null
          updated_at?: string | null
          wound_number: string
          wound_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string
          onset_date?: string
          patient_id?: string
          status?: string | null
          updated_at?: string | null
          wound_number?: string
          wound_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wounds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_perform_procedure: {
        Args: { cpt_code: string; user_credentials: string }
        Returns: boolean
      }
      get_allowed_procedures: {
        Args: { user_credentials: string }
        Returns: {
          category: string
          procedure_code: string
          procedure_name: string
        }[]
      }
      get_current_user_credentials: {
        Args: never
        Returns: {
          credentials: string
          name: string
        }[]
      }
      get_patient_document_count: {
        Args: { patient_uuid: string }
        Returns: number
      }
      get_patient_gtube_procedure_count: {
        Args: { patient_id_param: string }
        Returns: number
      }
      get_restricted_procedures: {
        Args: { user_credentials: string }
        Returns: {
          category: string
          procedure_code: string
          procedure_name: string
          required_credentials: string[]
        }[]
      }
      get_signature_audit_logs: {
        Args: {
          p_end_date?: string
          p_facility_id?: string
          p_limit?: number
          p_offset?: number
          p_signature_type?: string
          p_start_date?: string
          p_tenant_id?: string
          p_user_id?: string
        }
        Returns: {
          created_at: string
          facility_id: string
          facility_name: string
          ip_address: string
          patient_id: string
          patient_mrn: string
          patient_name: string
          signature_id: string
          signature_method: string
          signature_type: string
          signed_at: string
          signer_credentials: string
          signer_name: string
          signer_role: string
          signer_user_id: string
          visit_date: string
          visit_id: string
          visit_status: string
          visit_type: string
        }[]
      }
      get_signature_audit_stats: {
        Args: {
          p_end_date?: string
          p_facility_id?: string
          p_start_date?: string
          p_tenant_id?: string
        }
        Returns: {
          consent_signatures: number
          drawn_signatures: number
          patient_signatures: number
          provider_signatures: number
          total_signatures: number
          total_visits_signed: number
          typed_signatures: number
          unique_signers: number
          uploaded_signatures: number
        }[]
      }
      get_skilled_nursing_assessment_with_wounds: {
        Args: { assessment_id_param: string }
        Returns: Json
      }
      get_tenant_user_roles: {
        Args: { tenant_uuid: string }
        Returns: {
          created_at: string
          facility_id: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      get_user_role_info: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          facility_id: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      get_user_tenant_id: { Args: { p_user_id: string }; Returns: string }
      get_visit_addendums: {
        Args: { p_visit_id: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          note: string
          note_type: string
          users: Json
        }[]
      }
      get_visit_all_assessments: {
        Args: { visit_id_param: string }
        Returns: Json
      }
      has_facility_access: {
        Args: { p_facility_id: string; p_user_id: string }
        Returns: boolean
      }
      has_patient_consent: {
        Args: { p_consent_type?: string; p_patient_id: string }
        Returns: boolean
      }
      is_facility_admin: {
        Args: { p_facility_id: string; p_user_id: string }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      is_visit_ready_for_signature: {
        Args: { p_visit_id: string }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
