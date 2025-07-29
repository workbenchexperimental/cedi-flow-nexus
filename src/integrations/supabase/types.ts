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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          cedi_id: number
          created_at: string
          current_stock: number
          description: string | null
          id: number
          last_restocked_at: string | null
          master_article_id: number | null
          name: string
          reorder_point: number
          sku: string
          supplier: string | null
          unit_cost: number | null
        }
        Insert: {
          cedi_id: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: number
          last_restocked_at?: string | null
          master_article_id?: number | null
          name: string
          reorder_point?: number
          sku: string
          supplier?: string | null
          unit_cost?: number | null
        }
        Update: {
          cedi_id?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: number
          last_restocked_at?: string | null
          master_article_id?: number | null
          name?: string
          reorder_point?: number
          sku?: string
          supplier?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
          {
            foreignKeyName: "articles_master_article_id_fkey"
            columns: ["master_article_id"]
            isOneToOne: false
            referencedRelation: "master_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: number
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          id?: number
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: number
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_log: {
        Row: {
          backup_type: string
          completed_at: string | null
          error_message: string | null
          file_path: string | null
          file_size_mb: number | null
          id: number
          retention_until: string | null
          started_at: string
          status: string
          tables_included: string[] | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_mb?: number | null
          id?: number
          retention_until?: string | null
          started_at?: string
          status?: string
          tables_included?: string[] | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_mb?: number | null
          id?: number
          retention_until?: string | null
          started_at?: string
          status?: string
          tables_included?: string[] | null
        }
        Relationships: []
      }
      cedis: {
        Row: {
          id: number
          is_active: boolean
          location: string | null
          name: string
        }
        Insert: {
          id?: number
          is_active?: boolean
          location?: string | null
          name: string
        }
        Update: {
          id?: number
          is_active?: boolean
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: number
          id: number
          user_id: string
        }
        Insert: {
          group_id: number
          id?: number
          user_id: string
        }
        Update: {
          group_id?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          cedi_id: number
          created_at: string
          id: number
          name: string
        }
        Insert: {
          cedi_id: number
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          cedi_id?: number
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          article_id: number
          cedi_id: number
          created_at: string
          created_by: string | null
          id: number
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          article_id: number
          cedi_id: number
          created_at?: string
          created_by?: string | null
          id?: number
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          article_id?: number
          cedi_id?: number
          created_at?: string
          created_by?: string | null
          id?: number
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      master_articles: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          sku: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          sku: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          sku?: string
        }
        Relationships: []
      }
      master_package_components: {
        Row: {
          id: number
          master_article_id: number
          master_package_id: number
          quantity_required: number
        }
        Insert: {
          id?: number
          master_article_id: number
          master_package_id: number
          quantity_required: number
        }
        Update: {
          id?: number
          master_article_id?: number
          master_package_id?: number
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "master_package_components_master_article_id_fkey"
            columns: ["master_article_id"]
            isOneToOne: false
            referencedRelation: "master_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_package_components_master_package_id_fkey"
            columns: ["master_package_id"]
            isOneToOne: false
            referencedRelation: "master_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      master_packages: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: number
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: number
          message: string
          read?: boolean
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: number
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_packages: {
        Row: {
          id: number
          order_id: number
          package_id: number
          quantity_produced_approved: number
          quantity_required: number
        }
        Insert: {
          id?: number
          order_id: number
          package_id: number
          quantity_produced_approved?: number
          quantity_required: number
        }
        Update: {
          id?: number
          order_id?: number
          package_id?: number
          quantity_produced_approved?: number
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_packages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_group_id: number | null
          cedi_id: number
          client_name: string | null
          completed_at: string | null
          created_at: string
          expected_delivery_date: string | null
          id: number
          order_ref: string | null
          priority: number | null
          status: Database["public"]["Enums"]["order_status"]
          total_estimated_cost: number | null
        }
        Insert: {
          assigned_group_id?: number | null
          cedi_id: number
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: number
          order_ref?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          total_estimated_cost?: number | null
        }
        Update: {
          assigned_group_id?: number | null
          cedi_id?: number
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: number
          order_ref?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          total_estimated_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
        ]
      }
      package_components: {
        Row: {
          article_id: number
          id: number
          package_id: number
          quantity_required: number
        }
        Insert: {
          article_id: number
          id?: number
          package_id: number
          quantity_required: number
        }
        Update: {
          article_id?: number
          id?: number
          package_id?: number
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_components_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_components_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          cedi_id: number
          commission_value: number
          created_at: string
          description: string | null
          id: number
          master_package_id: number | null
          name: string
        }
        Insert: {
          cedi_id: number
          commission_value?: number
          created_at?: string
          description?: string | null
          id?: number
          master_package_id?: number | null
          name: string
        }
        Update: {
          cedi_id?: number
          commission_value?: number
          created_at?: string
          description?: string | null
          id?: number
          master_package_id?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
          {
            foreignKeyName: "packages_master_package_id_fkey"
            columns: ["master_package_id"]
            isOneToOne: false
            referencedRelation: "master_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          cedi_id: number
          group_id: number | null
          id: number
          operario_id: string
          order_id: number
          package_id: number
          quantity_produced: number
          recorded_at: string
          rejection_reason: string | null
          supervisor_id_approval: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          cedi_id: number
          group_id?: number | null
          id?: number
          operario_id: string
          order_id: number
          package_id: number
          quantity_produced: number
          recorded_at?: string
          rejection_reason?: string | null
          supervisor_id_approval?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          cedi_id?: number
          group_id?: number | null
          id?: number
          operario_id?: string
          order_id?: number
          package_id?: number
          quantity_produced?: number
          recorded_at?: string
          rejection_reason?: string | null
          supervisor_id_approval?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
          {
            foreignKeyName: "production_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_operario_id_fkey"
            columns: ["operario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_supervisor_id_approval_fkey"
            columns: ["supervisor_id_approval"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          description: string | null
          environment: string | null
          is_encrypted: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string | null
          is_encrypted?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string | null
          is_encrypted?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          cedi_id: number | null
          id: number
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string
        }
        Insert: {
          cedi_id?: number | null
          id?: number
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string
        }
        Update: {
          cedi_id?: number | null
          id?: number
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_metrics_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_metrics_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
        ]
      }
      users: {
        Row: {
          cedi_id: number | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          cedi_id?: number | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          cedi_id?: number | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "cedis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_cedi_id_fkey"
            columns: ["cedi_id"]
            isOneToOne: false
            referencedRelation: "mv_system_health"
            referencedColumns: ["cedi_id"]
          },
        ]
      }
    }
    Views: {
      mv_system_health: {
        Row: {
          avg_pending_hours: number | null
          calculated_at: string | null
          cedi_id: number | null
          cedi_name: string | null
          health_status: string | null
          low_stock_alerts: number | null
          out_of_stock_alerts: number | null
          pending_approvals: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_cedi_admin_dashboard_metrics: {
        Args: { p_cedi_id?: number }
        Returns: Json
      }
      get_dashboard_metrics_by_role: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_operator_dashboard_metrics: {
        Args: { p_operario_id?: string }
        Returns: Json
      }
      get_superadmin_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_supervisor_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_system_config: {
        Args: { config_key: string; default_value?: string }
        Returns: string
      }
      get_user_cedi_id: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      update_article_stock: {
        Args: {
          p_article_id: number
          p_quantity: number
          p_movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          p_reference_type: string
          p_reference_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      approval_status: "Pendiente" | "Aprobado" | "Rechazado"
      inventory_movement_type: "IN" | "OUT" | "ADJUSTMENT"
      order_status: "Creada" | "En Proceso" | "Completada" | "Cancelada"
      user_role:
        | "superadministrador"
        | "administrador"
        | "supervisor"
        | "operario"
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
      approval_status: ["Pendiente", "Aprobado", "Rechazado"],
      inventory_movement_type: ["IN", "OUT", "ADJUSTMENT"],
      order_status: ["Creada", "En Proceso", "Completada", "Cancelada"],
      user_role: [
        "superadministrador",
        "administrador",
        "supervisor",
        "operario",
      ],
    },
  },
} as const
