/*
  # Fix Profile Policies and Triggers

  1. Changes
    - Update RLS policies for profiles table
    - Fix trigger function for profile creation
    - Add better error handling

  2. Security
    - Maintain RLS policies
    - Add proper security context
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
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
  type_val := COALESCE(
    (NEW.raw_user_meta_data->>'user_type')::user_type,
    'business'::user_type
  );

  -- Get role based on user type
  role_val := CASE
    WHEN type_val = 'business' THEN 'admin'::user_role
    ELSE 'sales_representative'::user_role
  END;

  -- Get employee role if applicable
  IF type_val = 'employee' THEN
    emp_role := (NEW.raw_user_meta_data->>'employee_role')::employee_role;
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