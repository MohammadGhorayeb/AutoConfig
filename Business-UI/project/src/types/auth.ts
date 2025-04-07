export type UserType = 'business' | 'employee';
export type EmployeeRole = 'engineer' | 'doctor' | 'sales';
export type UserRole = 'sales_representative' | 'engineer' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  user_type: UserType;
  employee_role: EmployeeRole | null;
  created_at: string;
}

export interface AuthError {
  message: string;
}