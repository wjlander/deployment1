/*
  # Initialize Default Positions

  1. New Data
    - Add default positions for KFC deployment system
    - Regular positions (DT, Cook, Burgers, etc.)
    - Pack positions (DT Pack, Rst Pack, etc.)
    - Areas (Cooks, Front, Lobby, etc.)
    - Cleaning areas (Lobby/Toilets, Kitchen, etc.)

  2. Security
    - Uses existing RLS policies on positions table
*/

-- Insert regular positions
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
  ('T1', 'position')
ON CONFLICT (name) DO NOTHING;

-- Insert pack positions
INSERT INTO positions (name, type) VALUES
  ('DT Pack', 'pack_position'),
  ('Rst Pack', 'pack_position'),
  ('Deliv Pack', 'pack_position')
ON CONFLICT (name) DO NOTHING;

-- Insert areas
INSERT INTO positions (name, type) VALUES
  ('Cooks', 'area'),
  ('DT', 'area'),
  ('Front', 'area'),
  ('Mid', 'area'),
  ('Lobby', 'area'),
  ('Pck Mid', 'area'),
  ('Float / Bottlenecks', 'area'),
  ('Table Service / Lobby', 'area')
ON CONFLICT (name) DO NOTHING;

-- Insert cleaning areas
INSERT INTO positions (name, type) VALUES
  ('Lobby / Toilets', 'cleaning_area'),
  ('Front', 'cleaning_area'),
  ('Staff Room / Toilet', 'cleaning_area'),
  ('Kitchen', 'cleaning_area')
ON CONFLICT (name) DO NOTHING;