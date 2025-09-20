/*
  # Add shift type support to deployments

  1. Schema Changes
    - Add `shift_type` column to deployments table
    - Add constraint to ensure valid shift types
    - Add index for efficient querying by date and shift type

  2. Data Migration
    - Set default shift type for existing deployments based on start time
    - Day shift: 06:00-17:59, Night shift: 18:00-05:59

  3. Validation
    - Ensure only 'Day Shift' or 'Night Shift' values are allowed
*/

-- Add shift_type column to deployments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'shift_type'
  ) THEN
    ALTER TABLE deployments ADD COLUMN shift_type text DEFAULT 'Day Shift';
  END IF;
END $$;

-- Add constraint to ensure valid shift types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'deployments_shift_type_check'
  ) THEN
    ALTER TABLE deployments 
    ADD CONSTRAINT deployments_shift_type_check 
    CHECK (shift_type IN ('Day Shift', 'Night Shift'));
  END IF;
END $$;

-- Update existing deployments to set shift type based on start time
UPDATE deployments 
SET shift_type = CASE 
  WHEN start_time >= '06:00' AND start_time < '18:00' THEN 'Day Shift'
  ELSE 'Night Shift'
END
WHERE shift_type IS NULL OR shift_type = 'Day Shift';

-- Make shift_type NOT NULL after setting defaults
ALTER TABLE deployments ALTER COLUMN shift_type SET NOT NULL;

-- Add index for efficient querying by date and shift type
CREATE INDEX IF NOT EXISTS idx_deployments_date_shift_type 
ON deployments (date, shift_type);

-- Add function to check deployment limits
CREATE OR REPLACE FUNCTION check_deployment_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we already have 2 deployments for this date and shift type
  IF (
    SELECT COUNT(*) 
    FROM deployments 
    WHERE date = NEW.date AND shift_type = NEW.shift_type
  ) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 deployments per shift type per day exceeded for % %', NEW.shift_type, NEW.date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce deployment limits
DROP TRIGGER IF EXISTS deployment_limit_trigger ON deployments;
CREATE TRIGGER deployment_limit_trigger
  BEFORE INSERT ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION check_deployment_limit();