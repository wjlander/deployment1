/*
  # Create deployment management tables

  1. New Tables
    - `staff` - Store staff members with their details
    - `positions` - Store available positions (primary, pack, areas, cleaning)
    - `deployments` - Store deployment assignments by date
    - `shift_info` - Store shift information by date
    - `sales_data` - Store sales data entries

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is a single-user system)
*/

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_under_18 boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Positions and areas table
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('position', 'pack_position', 'area', 'cleaning_area')),
  created_at timestamptz DEFAULT now()
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  position text NOT NULL,
  secondary text DEFAULT '',
  area text DEFAULT '',
  cleaning text DEFAULT '',
  break_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shift info table
CREATE TABLE IF NOT EXISTS shift_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text UNIQUE NOT NULL,
  forecast text DEFAULT '£0.00',
  day_shift_forecast text DEFAULT '£0.00',
  night_shift_forecast text DEFAULT '£0.00',
  weather text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales data table
CREATE TABLE IF NOT EXISTS sales_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  today_data text DEFAULT '',
  last_week_data text DEFAULT '',
  last_year_data text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow all operations on staff" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all operations on positions" ON positions FOR ALL USING (true);
CREATE POLICY "Allow all operations on deployments" ON deployments FOR ALL USING (true);
CREATE POLICY "Allow all operations on shift_info" ON shift_info FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales_data" ON sales_data FOR ALL USING (true);

-- Insert default positions
INSERT INTO positions (name, type) VALUES
  ('DT', 'position'),
  ('DT2', 'position'),
  ('Cook', 'position'),
  ('Cook2', 'position'),
  ('Burgers', 'position'),
  ('Fries', 'position'),
  ('Chick', 'position'),
  ('Rst', 'position'),
  ('Lobby', 'position'),
  ('Front', 'position'),
  ('Mid', 'position'),
  ('Transfer', 'position'),
  ('T1', 'position'),
  ('DT Pack', 'pack_position'),
  ('Rst Pack', 'pack_position'),
  ('Deliv Pack', 'pack_position'),
  ('Cooks', 'area'),
  ('DT', 'area'),
  ('Front', 'area'),
  ('Mid', 'area'),
  ('Lobby', 'area'),
  ('Pck Mid', 'area'),
  ('Float / Bottlenecks', 'area'),
  ('Table Service / Lobby', 'area'),
  ('Lobby / Toilets', 'cleaning_area'),
  ('Front', 'cleaning_area'),
  ('Staff Room / Toilet', 'cleaning_area'),
  ('Kitchen', 'cleaning_area')
ON CONFLICT DO NOTHING;