/*
  # Create employee-specific tables

  1. New Tables
    - `employee_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles.id)
      - `full_name` (text, not null)
      - `position` (text, not null)
      - `department` (text, not null)
      - `hire_date` (date, not null)
      - `salary` (numeric, not null)
      - `status` (text, default: 'active')
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, default: now())

    - `employee_attendance`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employee_profiles.id)
      - `check_in` (timestamptz, not null)
      - `check_out` (timestamptz)
      - `status` (text, default: 'present')
      - `created_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for employee access
*/

-- Employee Profiles Table
CREATE TABLE employee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  full_name text NOT NULL,
  position text NOT NULL,
  department text NOT NULL,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  salary numeric NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Employee Attendance Table
CREATE TABLE employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) NOT NULL,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  status text DEFAULT 'present',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for employee_profiles
CREATE POLICY "Employees can view own profile"
  ON employee_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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
    auth.uid() IN (
      SELECT user_id 
      FROM employee_profiles 
      WHERE id = employee_attendance.employee_id
    )
  );

CREATE POLICY "Employees can create own attendance"
  ON employee_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM employee_profiles 
      WHERE id = employee_attendance.employee_id
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();