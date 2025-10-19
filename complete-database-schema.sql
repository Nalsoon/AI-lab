-- Complete Database Schema for Nutrition Tracker
-- Run this in your Supabase SQL Editor

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  age INTEGER,
  height_cm DECIMAL,
  weight_kg DECIMAL,
  activity_level TEXT,
  fitness_goal TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_goal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm DECIMAL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg DECIMAL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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

-- Create daily_goals table
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

-- Create monthly_goals table
CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  month_year TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_value DECIMAL,
  goal_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_progress table
CREATE TABLE IF NOT EXISTS goal_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  goal_id UUID,
  goal_type TEXT NOT NULL,
  date DATE NOT NULL,
  progress_value DECIMAL,
  progress_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_templates table
CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,
  template_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weight_entries table
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  weight_kg DECIMAL NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_data table
CREATE TABLE IF NOT EXISTS activity_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  active_calories DECIMAL DEFAULT 0,
  total_calories DECIMAL DEFAULT 0,
  steps INTEGER DEFAULT 0,
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for meals
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

-- Create RLS policies for food_items
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

-- Create RLS policies for daily_goals
DROP POLICY IF EXISTS "Users can view own daily goals" ON daily_goals;
CREATE POLICY "Users can view own daily goals" ON daily_goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily goals" ON daily_goals;
CREATE POLICY "Users can insert own daily goals" ON daily_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily goals" ON daily_goals;
CREATE POLICY "Users can update own daily goals" ON daily_goals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily goals" ON daily_goals;
CREATE POLICY "Users can delete own daily goals" ON daily_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for monthly_goals
DROP POLICY IF EXISTS "Users can view own monthly goals" ON monthly_goals;
CREATE POLICY "Users can view own monthly goals" ON monthly_goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own monthly goals" ON monthly_goals;
CREATE POLICY "Users can insert own monthly goals" ON monthly_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own monthly goals" ON monthly_goals;
CREATE POLICY "Users can update own monthly goals" ON monthly_goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for goal_progress
DROP POLICY IF EXISTS "Users can view own goal progress" ON goal_progress;
CREATE POLICY "Users can view own goal progress" ON goal_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goal progress" ON goal_progress;
CREATE POLICY "Users can insert own goal progress" ON goal_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for weight_entries
DROP POLICY IF EXISTS "Users can view own weight entries" ON weight_entries;
CREATE POLICY "Users can view own weight entries" ON weight_entries
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weight entries" ON weight_entries;
CREATE POLICY "Users can insert own weight entries" ON weight_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weight entries" ON weight_entries;
CREATE POLICY "Users can update own weight entries" ON weight_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for activity_data
DROP POLICY IF EXISTS "Users can view own activity data" ON activity_data;
CREATE POLICY "Users can view own activity data" ON activity_data
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity data" ON activity_data;
CREATE POLICY "Users can insert own activity data" ON activity_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activity data" ON activity_data;
CREATE POLICY "Users can update own activity data" ON activity_data
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_activity_level ON profiles(activity_level);
CREATE INDEX IF NOT EXISTS idx_profiles_fitness_goal ON profiles(fitness_goal);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type);
CREATE INDEX IF NOT EXISTS idx_food_items_meal_id ON food_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_goals_active ON daily_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_month ON monthly_goals(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_date ON goal_progress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_data_user_date ON activity_data(user_id, date);

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
