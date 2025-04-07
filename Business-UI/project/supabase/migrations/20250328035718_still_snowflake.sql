/*
  # Fix all database issues

  1. Changes
    - Drop and recreate all policies
    - Update trigger function with proper error handling
    - Fix employee profile creation
    - Add missing indexes
    - Add proper constraints

  2. Security
    - Maintain RLS policies
    - Add proper error handling
    - Ensure proper type casting
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Employees can view own profile" ON employee_profiles;
  DROP POLICY IF EXISTS "Employees can update own profile" ON employee_profiles;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  role_val user_role;
  type_val user_type;
  emp_role employee_role;
BEGIN
  -- Get user type with fallback
  BEGIN
    type_val := (NEW.raw_user_meta_data->>'user_type')::user_type;
  EXCEPTION WHEN OTHERS THEN
    type_val := 'business'::user_type;
  END;

  -- Get role based on user type
  role_val := CASE
    WHEN type_val = 'business' THEN 'admin'::user_role
    ELSE 'sales_representative'::user_role
  END;

  -- Get employee role if applicable
  IF type_val = 'employee' THEN
    BEGIN
      emp_role := (NEW.raw_user_meta_data->>'employee_role')::employee_role;
    EXCEPTION WHEN OTHERS THEN
      emp_role := NULL;
    END;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    role,
    user_type,
    employee_role,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    role_val,
    type_val,
    emp_role,
    now()
  );

  -- Create employee profile if needed
  IF type_val = 'employee' THEN
    BEGIN
      INSERT INTO public.employee_profiles (
        user_id,
        full_name,
        position,
        department,
        salary,
        hire_date,
        status
      )
      VALUES (
        NEW.id,
        split_part(NEW.email, '@', 1),
        COALESCE(emp_role::text, 'New Employee'),
        'General',
        0,
        CURRENT_DATE,
        'active'
      );
    EXCEPTION WHEN unique_violation THEN
      -- Profile already exists, ignore
      NULL;
    WHEN OTHERS THEN
      RAISE LOG 'Error creating employee profile: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in create_profile_for_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id ON employee_attendance(employee_id);

-- Add missing constraints
ALTER TABLE employee_profiles
  ADD CONSTRAINT employee_profiles_salary_check CHECK (salary >= 0);

ALTER TABLE tasks
  ADD CONSTRAINT tasks_completion_check CHECK (status IN ('pending', 'completed'));

ALTER TABLE employee_attendance
  ADD CONSTRAINT employee_attendance_check_in_check CHECK (check_in <= CURRENT_TIMESTAMP),
  ADD CONSTRAINT employee_attendance_check_out_check CHECK (check_out IS NULL OR check_out >= check_in);