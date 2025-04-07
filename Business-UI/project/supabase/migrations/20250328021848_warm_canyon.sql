/*
  # Add chat and role selection features

  1. New Tables
    - `user_types`
      - `type` (text, primary key) - Either 'business' or 'employee'
    - `chat_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `content` (text)
      - `created_at` (timestamp)
      - `role_context` (text) - The role context when message was sent

  2. Changes
    - Add `user_type` column to profiles table
    - Add `employee_role` column to profiles table
    
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create user_types enum
CREATE TYPE user_type AS ENUM ('business', 'employee');

-- Create employee_role enum
CREATE TYPE employee_role AS ENUM ('engineer', 'doctor', 'sales');

-- Add new columns to profiles
ALTER TABLE profiles 
ADD COLUMN user_type user_type DEFAULT 'business',
ADD COLUMN employee_role employee_role DEFAULT NULL;

-- Create chat_messages table
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  role_context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can insert their own messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();