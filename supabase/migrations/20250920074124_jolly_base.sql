/*
  # Create sales records table for time-based forecasts

  1. New Tables
    - `sales_records`
      - `id` (uuid, primary key)
      - `date` (text, not null)
      - `time` (text, not null) - format: "HH:MM"
      - `forecast` (numeric, not null) - forecast amount for that time
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `sales_records` table
    - Add policy for public access (matching existing pattern)

  3. Indexes
    - Unique constraint on date + time combination
    - Index on date for efficient querying
*/

CREATE TABLE IF NOT EXISTS sales_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  time text NOT NULL,
  forecast numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on date + time
ALTER TABLE sales_records ADD CONSTRAINT sales_records_date_time_key UNIQUE (date, time);

-- Add index on date for efficient querying
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records (date);

-- Enable RLS
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

-- Add policy for public access (matching existing pattern)
CREATE POLICY "Allow all operations on sales_records"
  ON sales_records
  FOR ALL
  TO public
  USING (true);