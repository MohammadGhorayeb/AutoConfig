/*
  # Fix dashboard fetching issues

  1. Changes
    - Update RLS policies for employees and projects tables
    - Add policies for business users to manage employees and projects
    - Fix employee profile policies
    
  2. Security
    - Ensure business users can manage their resources
    - Ensure proper access control for different user types
*/

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view all employees" ON employees;
  DROP POLICY IF EXISTS "Users can create employees" ON employees;
  DROP POLICY IF EXISTS "Users can update their created employees" ON employees;
  DROP POLICY IF EXISTS "Users can delete their created employees" ON employees;
  
  DROP POLICY IF EXISTS "Users can view all projects" ON projects;
  DROP POLICY IF EXISTS "Users can create projects" ON projects;
  DROP POLICY IF EXISTS "Users can update their created projects" ON projects;
  DROP POLICY IF EXISTS "Users can delete their created projects" ON projects;
  
  DROP POLICY IF EXISTS "Employees can view own profile" ON employee_profiles;
  DROP POLICY IF EXISTS "Employees can create own profile" ON employee_profiles;
  DROP POLICY IF EXISTS "Employees can update own profile" ON employee_profiles;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Policies for employees table
CREATE POLICY "Business users can view all employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

CREATE POLICY "Business users can create employees"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

CREATE POLICY "Business users can update employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

CREATE POLICY "Business users can delete employees"
  ON employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

-- Policies for projects table
CREATE POLICY "Business users can view all projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

CREATE POLICY "Business users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

CREATE POLICY "Business users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

CREATE POLICY "Business users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
  );

-- Policies for employee_profiles table
CREATE POLICY "Users can view employee profiles"
  ON employee_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow business users to view all profiles
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'business'
    )
    OR
    -- Allow employees to view their own profile
    auth.uid() = user_id
  );

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

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);