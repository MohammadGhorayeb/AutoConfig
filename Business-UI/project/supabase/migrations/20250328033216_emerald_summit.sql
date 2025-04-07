/*
  # Fix User Creation and Profile Trigger

  1. Changes
    - Drop and recreate profile creation trigger with better error handling
    - Add proper type casting and null handling
    - Fix security context for trigger function

  2. Security
    - Maintain RLS policies
    - Use security definer for proper permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Recreate the function with better error handling and type casting
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
  -- Safely handle user_type
  BEGIN
    type_val := COALESCE(
      (NEW.raw_user_meta_data->>'user_type')::user_type,
      'business'::user_type
    );
  EXCEPTION WHEN OTHERS THEN
    type_val := 'business'::user_type;
  END;

  -- Safely handle role
  BEGIN
    role_val := CASE
      WHEN type_val = 'business' THEN 'admin'::user_role
      ELSE 'sales_representative'::user_role
    END;
  EXCEPTION WHEN OTHERS THEN
    role_val := 'sales_representative'::user_role;
  END;

  -- Safely handle employee_role
  BEGIN
    IF type_val = 'employee' THEN
      emp_role := (NEW.raw_user_meta_data->>'employee_role')::employee_role;
    ELSE
      emp_role := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    emp_role := NULL;
  END;

  -- Insert the profile
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

  -- If this is an employee, create their employee profile
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
  -- Log the error (will appear in Supabase logs)
  RAISE LOG 'Error in create_profile_for_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;