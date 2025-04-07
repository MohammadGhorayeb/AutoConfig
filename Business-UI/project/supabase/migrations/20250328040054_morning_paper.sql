/*
  # Fix RLS policies for employee profiles and attendance

  1. Changes
    - Add INSERT policy for employee_profiles
    - Add INSERT policy for employee_attendance
    - Update existing policies to be more permissive during initial setup
    - Add missing indexes for performance

  2. Security
    - Maintain RLS while allowing proper access
    - Ensure authenticated users can create and manage their profiles
*/

-- Enable RLS on all tables (in case it's not enabled)
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Employees can view own profile" ON employee_profiles;
  DROP POLICY IF EXISTS "Employees can update own profile" ON employee_profiles;
  DROP POLICY IF EXISTS "Employees can create own profile" ON employee_profiles;
  DROP POLICY IF EXISTS "Employees can view own attendance" ON employee_attendance;
  DROP POLICY IF EXISTS "Employees can create own attendance" ON employee_attendance;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Policies for employee_profiles
CREATE POLICY "Employees can view own profile"
  ON employee_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can create own profile"
  ON employee_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own profile"
  ON employee_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for employee_attendance
CREATE POLICY "Employees can view own attendance"
  ON employee_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM employee_profiles 
      WHERE id = employee_attendance.employee_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create own attendance"
  ON employee_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM employee_profiles 
      WHERE id = employee_attendance.employee_id 
      AND user_id = auth.uid()
    )
  );

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id ON employee_attendance(employee_id);

-- Add helpful constraints
ALTER TABLE employee_attendance
  DROP CONSTRAINT IF EXISTS employee_attendance_check_in_check,
  DROP CONSTRAINT IF EXISTS employee_attendance_check_out_check,
  ADD CONSTRAINT employee_attendance_check_in_check 
    CHECK (check_in <= CURRENT_TIMESTAMP),
  ADD CONSTRAINT employee_attendance_check_out_check 
    CHECK (check_out IS NULL OR check_out >= check_in);