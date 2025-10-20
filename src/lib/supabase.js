import { createClient } from '@supabase/supabase-js'

// These will be set as environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

// Debug environment variables
console.log('🔧 Supabase Config Check:', {
  url: supabaseUrl,
  keyPresent: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0,
  urlValid: supabaseUrl !== 'your-supabase-url',
  keyValid: supabaseAnonKey !== 'your-supabase-anon-key'
});

// Check if we have valid configuration
if (supabaseUrl === 'your-supabase-url' || supabaseAnonKey === 'your-supabase-anon-key') {
  console.error('❌ Supabase configuration is using default values. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Database helper functions
export const db = {
  // Generic CRUD operations
  async create(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  },

  async read(table, filters = {}) {
    let query = supabase.from(table)

    // Handle both structured and JSON field filters
    Object.entries(filters).forEach(([key, value]) => {
      if (key.includes('.')) {
        // JSON path query: 'config.targets.calories'
        query = query.filter(key, 'eq', value)
      } else {
        // Regular column query
        query = query.eq(key, value)
      }
    })

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async update(table, id, updates) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Specialized functions for nutrition tracking
  async getDailyMeals(userId, date) {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        food_items (*)
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  async getDailyTotals(userId, date) {
    const { data, error } = await supabase
      .from('meals')
      .select('total_calories, total_protein, total_carbs, total_fat')
      .eq('user_id', userId)
      .eq('date', date)

    if (error) throw error

    // Sum up totals
    return data.reduce((totals, meal) => ({
      calories: totals.calories + (meal.total_calories || 0),
      protein: totals.protein + (meal.total_protein || 0),
      carbs: totals.carbs + (meal.total_carbs || 0),
      fat: totals.fat + (meal.total_fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  },

  async getActivityData(userId, date) {
    const { data, error } = await supabase
      .from('activity_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)

    if (error) throw error
    return data
  },

  // Goal tracking functions
  async getDailyGoals(userId, date) {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async getMonthlyGoals(userId, year, month) {
    const { data, error } = await supabase
      .from('monthly_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async getGoalProgress(userId, date, goalType = 'daily') {
    const { data, error } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('goal_type', goalType)

    if (error) throw error
    return data
  },

  async createDailyGoal(userId, date, goalData) {
    const { data, error } = await supabase
      .from('daily_goals')
      .upsert({
        user_id: userId,
        date,
        ...goalData
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async createMonthlyGoal(userId, year, month, goalData) {
    const { data, error } = await supabase
      .from('monthly_goals')
      .upsert({
        user_id: userId,
        year,
        month,
        ...goalData
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateGoalProgress(userId, date, goalType, goalId, progressData) {
    const { data, error } = await supabase
      .from('goal_progress')
      .upsert({
        user_id: userId,
        date,
        goal_type: goalType,
        goal_id: goalId,
        ...progressData
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getGoalTemplates(category = null, difficulty = null) {
    let query = supabase.from('goal_templates').select('*')

    if (category) query = query.eq('category', category)
    if (difficulty) query = query.eq('difficulty', difficulty)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Calculate goal progress
  async calculateDailyProgress(userId, date) {
    try {
      // Get daily totals
      const totals = await this.getDailyTotals(userId, date)

      // Get daily goals
      const goals = await this.getDailyGoals(userId, date)

      if (!goals) return null

      // Calculate progress percentages
      const progress = {
        calories: goals.calories_target ? (totals.calories / goals.calories_target) * 100 : 0,
        protein: goals.protein_target ? (totals.protein / goals.protein_target) * 100 : 0,
        carbs: goals.carbs_target ? (totals.carbs / goals.carbs_target) * 100 : 0,
        fat: goals.fat_target ? (totals.fat / goals.fat_target) * 100 : 0
      }

      // Update goal progress
      await this.updateGoalProgress(userId, date, 'daily', goals.id, {
        calories_actual: totals.calories,
        calories_target: goals.calories_target,
        calories_progress: progress.calories,
        protein_actual: totals.protein,
        protein_target: goals.protein_target,
        protein_progress: progress.protein,
        carbs_actual: totals.carbs,
        carbs_target: goals.carbs_target,
        carbs_progress: progress.carbs,
        fat_actual: totals.fat,
        fat_target: goals.fat_target,
        fat_progress: progress.fat
      })

      return progress
    } catch (error) {
      console.error('Error calculating daily progress:', error)
      return null
    }
  },

  // Get goal analytics
  async getGoalAnalytics(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw error
    return data
  },

  // Food corrections functions
  async getFoodCorrections(userId, foodName = null) {
    let query = supabase
      .from('food_corrections')
      .select('*')
      .eq('user_id', userId)
    
    if (foodName) {
      query = query.eq('food_name', foodName)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async saveFoodCorrection(userId, correctionData) {
    const { data, error } = await supabase
      .from('food_corrections')
      .upsert({
        user_id: userId,
        ...correctionData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteFoodCorrection(userId, foodName) {
    const { error } = await supabase
      .from('food_corrections')
      .delete()
      .eq('user_id', userId)
      .eq('food_name', foodName)

    if (error) throw error
  },

  async applyCorrectionsToFoodItems(userId, foodItems) {
    // Get all corrections for this user
    const corrections = await this.getFoodCorrections(userId)
    
    // Create a map for quick lookup
    const correctionMap = new Map()
    corrections.forEach(correction => {
      correctionMap.set(correction.food_name.toLowerCase(), correction)
    })

    // Apply corrections to food items
    return foodItems.map(item => {
      const correction = correctionMap.get(item.name.toLowerCase())
      if (correction) {
        return {
          ...item,
          calories: correction.corrected_calories || item.calories,
          protein: correction.corrected_protein || item.protein,
          carbs: correction.corrected_carbs || item.carbs,
          fat: correction.corrected_fat || item.fat,
          has_correction: true,
          original_calories: item.calories,
          original_protein: item.protein,
          original_carbs: item.carbs,
          original_fat: item.fat
        }
      }
      return item
    })
  }
}