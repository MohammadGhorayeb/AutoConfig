/*
  # Create tasks table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `status` (text, not null, default: 'pending')
      - `priority` (text, not null)
      - `due_date` (date, not null)
      - `assigned_to` (uuid, foreign key to profiles.id)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for:
      - Users can read their own tasks
      - Users can create tasks for themselves
      - Users can update their own tasks
*/

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL,
  due_date date NOT NULL,
  assigned_to uuid NOT NULL REFERENCES profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own tasks
CREATE POLICY "Users can read own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_to);

-- Policy: Users can create tasks for themselves
CREATE POLICY "Users can create own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = assigned_to);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);