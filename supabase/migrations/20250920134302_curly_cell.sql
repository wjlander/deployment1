/*
  # Update cleaning terminology to closing

  1. Schema Changes
    - Rename `cleaning` column to `closing` in deployments table
    - Update any existing data references

  2. New Tables
    - `targets` table for managing deployment targets
      - `id` (uuid, primary key)
      - `name` (text, target name)
      - `value` (text, target value/description)
      - `priority` (integer, display order)
      - `is_active` (boolean, whether to show)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  3. Security
    - Enable RLS on targets table
    - Add policies for public access
*/

-- Rename cleaning column to closing in deployments table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'cleaning'
  ) THEN
    ALTER TABLE deployments RENAME COLUMN cleaning TO closing;
  END IF;
END $$;

-- Create targets table
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value text NOT NULL DEFAULT '',
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on targets table
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- Create policies for targets
CREATE POLICY "Allow all operations on targets"
  ON targets
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index for ordering targets
CREATE INDEX IF NOT EXISTS idx_targets_priority ON targets (priority, is_active);