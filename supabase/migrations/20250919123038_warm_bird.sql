/*
  # Add position-area relationship and editing capabilities

  1. Schema Changes
    - Add `area_id` column to positions table to link positions to areas
    - Add foreign key constraint for referential integrity

  2. Security
    - Maintain existing RLS policies
*/

-- Add area_id column to positions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions' AND column_name = 'area_id'
  ) THEN
    ALTER TABLE positions ADD COLUMN area_id uuid REFERENCES positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_positions_area_id ON positions(area_id);