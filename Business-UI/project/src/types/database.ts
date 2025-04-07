import { UserProfile } from './auth';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'online' | 'offline';
  join_date: string;
  created_at: string;
  created_by: string;
}

export interface Project {
  id: string;
  name: string;
  budget: number;
  status: 'Working' | 'Done' | 'Cancelled';
  completion: number;
  created_at: string;
  created_by: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assigned_to: string;
  completed_at?: string;
  created_at: string;
}

export interface EmployeeProfile {
  id: string;
  user_id: string;
  full_name: string;
  position: string;
  department: string;
  hire_date: string;
  salary: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  check_in: string;
  check_out?: string;
  status: string;
  created_at: string;
}