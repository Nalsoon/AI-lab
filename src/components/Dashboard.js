import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FireIcon, BoltIcon, TrendingUpIcon, ScaleIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { db } from '../lib/supabase'

const Dashboard = () => {
  const [today, setToday] = useState(new Date())
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  })
  const [activityData, setActivityData] = useState({
    activeCalories: 0,
    totalCalories: 0,
    steps: 0
  })
  const [meals, setMeals] = useState([])
  const [dailyGoals, setDailyGoals] = useState(null)
  const [goalProgress, setGoalProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDailyData()
  }, [today])

  const loadDailyData = async () => {
    setLoading(true)
    const dateStr = format(today, 'yyyy-MM-dd')
    // For now, use a placeholder user ID. In a real app, this would come from auth.
    const userId = 'user-id' // Replace with actual user ID from Supabase auth

    try {
      // Load daily totals
      const totals = await db.getDailyTotals(userId, dateStr)
      setDailyTotals(totals)

      // Load meals
      const dailyMeals = await db.getDailyMeals(userId, dateStr)
      setMeals(dailyMeals)

      // Load activity data
      const activity = await db.getActivityData(userId, dateStr)
      if (activity.length > 0) {
        const combined = activity.reduce((acc, item) => ({
          activeCalories: acc.activeCalories + (item.active_calories || 0),
          totalCalories: acc.totalCalories + (item.total_calories || 0),
          steps: acc.steps + (item.steps || 0)
        }), { activeCalories: 0, totalCalories: 0, steps: 0 })
        setActivityData(combined)
      }

      // Load daily goals and progress
      const goals = await db.getDailyGoals(userId, dateStr)
      setDailyGoals(goals)

      if (goals) {
        const progress = await db.calculateDailyProgress(userId, dateStr)
        setGoalProgress(progress)
      }
    } catch (error) {
      console.error('Error loading daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const netCalories = dailyTotals.calories - activityData.activeCalories

  const MacroCard = ({ title, value, unit, icon: Icon, color, goal = null, progress = null }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value} {unit}
          </p>
          {goal && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Goal: {goal} {unit}</span>
                <span>{Math.round((value / goal) * 100)}%</span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    value >= goal ? 'bg-green-500' :
                    progress && progress > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((value / goal) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading daily data...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-lg text-gray-600 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
          {format(today, 'PPP')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MacroCard
          title="Calories"
          value={dailyTotals.calories}
          unit="kcal"
          icon={FireIcon}
          color="bg-red-500"
          goal={dailyGoals?.calories_target || 2500}
          progress={goalProgress?.calories}
        />
        <MacroCard
          title="Protein"
          value={Math.round(dailyTotals.protein)}
          unit="g"
          icon={BoltIcon}
          color="bg-blue-500"
          goal={dailyGoals?.protein_target || 150}
          progress={goalProgress?.protein}
        />
        <MacroCard
          title="Carbs"
          value={Math.round(dailyTotals.carbs)}
          unit="g"
          icon={TrendingUpIcon}
          color="bg-green-500"
          goal={dailyGoals?.carbs_target || 300}
          progress={goalProgress?.carbs}
        />
        <MacroCard
          title="Fat"
          value={Math.round(dailyTotals.fat)}
          unit="g"
          icon={ScaleIcon}
          color="bg-yellow-500"
          goal={dailyGoals?.fat_target || 100}
          progress={goalProgress?.fat}
        />
      </div>

      {/* Calorie Balance */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Calorie Balance</h2>
        <div className="flex justify-around items-center text-center">
          <div>
            <p className="text-sm text-gray-600">Intake</p>
            <p className="text-2xl font-bold text-gray-900">{dailyTotals.calories} kcal</p>
          </div>
          <div className="text-2xl text-gray-500">+</div>
          <div>
            <p className="text-sm text-gray-600">Burned</p>
            <p className="text-2xl font-bold text-gray-900">{activityData.activeCalories} kcal</p>
          </div>
          <div className="text-2xl text-gray-500">=</div>
          <div>
            <p className="text-sm text-gray-600">Net</p>
            <p className="text-2xl font-bold text-gray-900">{netCalories} kcal</p>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Meals Today</h2>
        {meals.length === 0 ? (
          <p className="text-gray-600">No meals logged yet. Start logging your food!</p>
        ) : (
          <ul className="space-y-4">
            {meals.map(meal => (
              <li key={meal.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">{meal.name} ({meal.meal_type})</h3>
                  <span className="text-gray-700">{meal.total_calories} kcal</span>
                </div>
                <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-600">
                  {meal.food_items.map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.name} ({item.quantity} {item.unit})</span>
                      <span>{item.calories} kcal</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end text-sm text-gray-500 mt-2">
                  <span>P: {meal.total_protein}g | C: {meal.total_carbs}g | F: {meal.total_fat}g</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Dashboard
