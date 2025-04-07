/*
  # Fix Authentication and RLS Policies

  1. Changes
    - Drop and recreate profiles table RLS policies
    - Add proper policies for profile creation and management
    - Fix user registration flow

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policies for new user registration
*/

-- First, drop existing policies on profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Enable RLS (in case it's not enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow new users to create their profile during signup
CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop and recreate the profile creation trigger to handle user types
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    user_type,
    employee_role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales_representative'),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'business'),
    (NEW.raw_user_meta_data->>'employee_role')::employee_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;