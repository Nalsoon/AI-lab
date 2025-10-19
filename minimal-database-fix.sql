-- Minimal Database Fix - Run this in Supabase SQL Editor
-- This script only creates the essential missing tables

-- First, let's check what tables exist and create only what's missing
-- Create daily_goals table (this is the main one causing 406 errors)
CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  calories_target INTEGER,
  protein_target DECIMAL,
  carbs_target DECIMAL,
  fat_target DECIMAL,
  goal_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  date DATE NOT NULL,
  total_calories DECIMAL DEFAULT 0,
  total_protein DECIMAL DEFAULT 0,
  total_carbs DECIMAL DEFAULT 0,
  total_fat DECIMAL DEFAULT 0,
  meal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food_items table
CREATE TABLE IF NOT EXISTS food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories DECIMAL DEFAULT 0,
  protein DECIMAL DEFAULT 0,
  carbs DECIMAL DEFAULT 0,
  fat DECIMAL DEFAULT 0,
  quantity DECIMAL DEFAULT 1,
  unit TEXT DEFAULT 'serving',
  ai_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the new tables
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for daily_goals
DROP POLICY IF EXISTS "Users can view own daily goals" ON daily_goals;
CREATE POLICY "Users can view own daily goals" ON daily_goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily goals" ON daily_goals;
CREATE POLICY "Users can insert own daily goals" ON daily_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily goals" ON daily_goals;
CREATE POLICY "Users can update own daily goals" ON daily_goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Create basic RLS policies for meals
DROP POLICY IF EXISTS "Users can view own meals" ON meals;
CREATE POLICY "Users can view own meals" ON meals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
CREATE POLICY "Users can insert own meals" ON meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meals" ON meals;
CREATE POLICY "Users can update own meals" ON meals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meals" ON meals;
CREATE POLICY "Users can delete own meals" ON meals
    FOR DELETE USING (auth.uid() = user_id);

-- Create basic RLS policies for food_items
DROP POLICY IF EXISTS "Users can view own food items" ON food_items;
CREATE POLICY "Users can view own food items" ON food_items
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM meals WHERE id = meal_id));

DROP POLICY IF EXISTS "Users can insert own food items" ON food_items;
CREATE POLICY "Users can insert own food items" ON food_items
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM meals WHERE id = meal_id));

DROP POLICY IF EXISTS "Users can update own food items" ON food_items;
CREATE POLICY "Users can update own food items" ON food_items
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM meals WHERE id = meal_id));

DROP POLICY IF EXISTS "Users can delete own food items" ON food_items;
CREATE POLICY "Users can delete own food items" ON food_items
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM meals WHERE id = meal_id));

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_items_meal_id ON food_items(meal_id);
