-- Food Item Corrections Schema
-- This table stores user corrections to AI-estimated nutrition values
-- Run this in your Supabase SQL Editor

-- Create food_corrections table
CREATE TABLE IF NOT EXISTS food_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  food_name TEXT NOT NULL,
  original_calories DECIMAL,
  original_protein DECIMAL,
  original_carbs DECIMAL,
  original_fat DECIMAL,
  corrected_calories DECIMAL,
  corrected_protein DECIMAL,
  corrected_carbs DECIMAL,
  corrected_fat DECIMAL,
  correction_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, food_name)
);

-- Enable RLS
ALTER TABLE food_corrections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own food corrections" ON food_corrections;
CREATE POLICY "Users can view own food corrections" ON food_corrections
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own food corrections" ON food_corrections;
CREATE POLICY "Users can insert own food corrections" ON food_corrections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own food corrections" ON food_corrections;
CREATE POLICY "Users can update own food corrections" ON food_corrections
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own food corrections" ON food_corrections;
CREATE POLICY "Users can delete own food corrections" ON food_corrections
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_corrections_user_id ON food_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_food_corrections_food_name ON food_corrections(food_name);
CREATE INDEX IF NOT EXISTS idx_food_corrections_user_food ON food_corrections(user_id, food_name);
