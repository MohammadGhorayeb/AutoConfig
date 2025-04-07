export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'sales_representative' | 'engineer' | 'admin'
          user_type: 'business' | 'employee'
          employee_role: 'engineer' | 'doctor' | 'sales' | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'sales_representative' | 'engineer' | 'admin'
          user_type?: 'business' | 'employee'
          employee_role?: 'engineer' | 'doctor' | 'sales' | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'sales_representative' | 'engineer' | 'admin'
          user_type?: 'business' | 'employee'
          employee_role?: 'engineer' | 'doctor' | 'sales' | null
          created_at?: string
        }
      }
      employee_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          position: string
          department: string
          hire_date: string
          salary: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          position: string
          department: string
          hire_date?: string
          salary: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          position?: string
          department?: string
          hire_date?: string
          salary?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'pending' | 'completed'
          priority: 'low' | 'medium' | 'high'
          due_date: string
          assigned_to: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'pending' | 'completed'
          priority: 'low' | 'medium' | 'high'
          due_date: string
          assigned_to: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'completed'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          content: string
          role_context: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          role_context?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          role_context?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employee_attendance: {
        Row: {
          id: string
          employee_id: string
          check_in: string
          check_out: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          check_in?: string
          check_out?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          check_in?: string
          check_out?: string | null
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_type: 'business' | 'employee'
      employee_role: 'engineer' | 'doctor' | 'sales'
      user_role: 'sales_representative' | 'engineer' | 'admin'
    }
  }
}