import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FireIcon, BoltIcon, ArrowTrendingUpIcon, ScaleIcon, CalendarIcon, ArrowPathIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import LogFoodModal from './LogFoodModal'

const Dashboard = () => {
  const { user } = useAuth()
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
  const [dailyGoals, setDailyGoals] = useState({
    calories_target: 2500,
    protein_target: 150,
    carbs_target: 300,
    fat_target: 100
  })
  const [loading, setLoading] = useState(false)
  const [showLogFoodModal, setShowLogFoodModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadDailyData()
    }
  }, [user, today])

  const loadDailyData = async () => {
    if (!user) return
    
    setLoading(true)
    const dateStr = format(today, 'yyyy-MM-dd')
    const userId = user.id

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

      // Load daily goals
      const goals = await db.getDailyGoals(userId, dateStr)
      if (goals) {
        setDailyGoals(goals)
      }
    } catch (error) {
      console.error('Error loading daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMealLogged = () => {
    // Refresh dashboard data when a new meal is logged
    loadDailyData()
  }

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Are you sure you want to delete this meal? This action cannot be undone.')) {
      return
    }

    try {
      // Delete food items first
      const meal = meals.find(m => m.id === mealId)
      if (meal && meal.food_items) {
        for (const item of meal.food_items) {
          if (item.id) {
            await db.delete('food_items', item.id)
          }
        }
      }

      // Delete meal
      await db.delete('meals', mealId)
      
      // Refresh data
      await loadDailyData()
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert('Failed to delete meal. Please try again.')
    }
  }

  const handleGoalSaved = () => {
    // Refresh dashboard data when goals are updated
    loadDailyData()
  }

  const handleEditMeal = (meal) => {
    setEditingMeal(meal)
    setShowEditModal(true)
  }

  const handleMealSaved = (updatedMeal) => {
    // Update the meals list with the edited meal
    setMeals(prev => prev.map(meal => 
      meal.id === updatedMeal.id ? updatedMeal : meal
    ))
    
    // Recalculate totals
    const newTotals = meals.reduce((acc, meal) => {
      if (meal.id === updatedMeal.id) {
        acc.calories += updatedMeal.total_calories || 0
        acc.protein += updatedMeal.total_protein || 0
        acc.carbs += updatedMeal.total_carbs || 0
        acc.fat += updatedMeal.total_fat || 0
      } else {
        acc.calories += meal.total_calories || 0
        acc.protein += meal.total_protein || 0
        acc.carbs += meal.total_carbs || 0
        acc.fat += meal.total_fat || 0
      }
      return acc
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
    
    setDailyTotals(newTotals)
  }

  const netCalories = dailyTotals.calories - activityData.activeCalories

  const MacroCard = ({ title, value, unit, icon: Icon, color, goal = null }) => (
    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: color === 'bg-red-500' ? '#ef4444' : color === 'bg-blue-500' ? '#3b82f6' : color === 'bg-green-500' ? '#10b981' : '#eab308' }}>
          <Icon style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
        </div>
        <div style={{ marginLeft: '1rem', flex: 1 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>{title}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
            {value} {unit}
          </p>
          {goal && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#6b7280' }}>
                <span>Goal: {goal} {unit}</span>
                <span>{Math.round((value / goal) * 100)}%</span>
              </div>
              <div style={{ marginTop: '0.25rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '0.5rem' }}>
                <div
                  style={{ 
                    height: '0.5rem', 
                    borderRadius: '9999px',
                    backgroundColor: value >= goal ? '#10b981' : '#3b82f6',
                    width: `${Math.min((value / goal) * 100, 100)}%` 
                  }}
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
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowGoalModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease-in-out',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
            title="Set nutrition goals"
          >
            Set Goals
          </button>
          <button
            onClick={loadDailyData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease-in-out'
            }}
            title="Refresh data"
          >
            <ArrowPathIcon style={{ height: '1rem', width: '1rem' }} />
          </button>
          <p style={{ fontSize: '1.125rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
            <CalendarIcon style={{ height: '1.25rem', width: '1.25rem', marginRight: '0.5rem', color: '#6b7280' }} />
            {format(today, 'PPP')}
          </p>
        </div>
      </div>

      {/* Log Food Call-to-Action */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.75rem', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
        padding: '2rem', 
        marginBottom: '2rem',
        border: '2px solid #e5e7eb',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '4rem', 
            height: '4rem', 
            backgroundColor: '#3b82f6', 
            borderRadius: '50%', 
            marginBottom: '1rem' 
          }}>
            <PlusIcon style={{ height: '2rem', width: '2rem', color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            Log Your Food
          </h2>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem', maxWidth: '32rem', margin: '0 auto 1.5rem auto' }}>
            Describe what you ate in natural language and let AI break it down into detailed nutrition information.
          </p>
          <button
            onClick={() => setShowLogFoodModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.75rem 2rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563eb'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <PlusIcon style={{ height: '1.25rem', width: '1.25rem', marginRight: '0.5rem' }} />
            Log Food
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <MacroCard
          title="Calories"
          value={dailyTotals.calories}
          unit="kcal"
          icon={FireIcon}
          color="bg-red-500"
          goal={dailyGoals?.calories_target || 2500}
        />
        <MacroCard
          title="Protein"
          value={Math.round(dailyTotals.protein)}
          unit="g"
          icon={BoltIcon}
          color="bg-blue-500"
          goal={dailyGoals?.protein_target || 150}
        />
        <MacroCard
          title="Carbs"
          value={Math.round(dailyTotals.carbs)}
          unit="g"
          icon={ArrowTrendingUpIcon}
          color="bg-green-500"
          goal={dailyGoals?.carbs_target || 300}
        />
        <MacroCard
          title="Fat"
          value={Math.round(dailyTotals.fat)}
          unit="g"
          icon={ScaleIcon}
          color="bg-yellow-500"
          goal={dailyGoals?.fat_target || 100}
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
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">{meal.name} ({meal.meal_type})</h3>
                      <span className="text-gray-700">{meal.total_calories} kcal</span>
                    </div>
                    <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-600">
                      {meal.food_items?.map(item => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.name} ({item.quantity} {item.unit})</span>
                          <span>{item.calories} kcal</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-end text-sm text-gray-500 mt-2">
                      <span>P: {meal.total_protein}g | C: {meal.total_carbs}g | F: {meal.total_fat}g</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEditMeal(meal)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit meal"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete meal"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Log Food Modal */}
      <LogFoodModal
        isOpen={showLogFoodModal}
        onClose={() => setShowLogFoodModal(false)}
        onMealLogged={handleMealLogged}
      />

      {/* Goal Setting Modal */}
      {showGoalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Set Nutrition Goals
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Set your daily nutrition targets to track your progress.
            </p>
            
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Calories Target
                </label>
                <input
                  type="number"
                  defaultValue={dailyGoals.calories_target}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                  placeholder="2500"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Protein Target (g)
                </label>
                <input
                  type="number"
                  defaultValue={dailyGoals.protein_target}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                  placeholder="150"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Carbs Target (g)
                </label>
                <input
                  type="number"
                  defaultValue={dailyGoals.carbs_target}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                  placeholder="300"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Fat Target (g)
                </label>
                <input
                  type="number"
                  defaultValue={dailyGoals.fat_target}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                  placeholder="100"
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowGoalModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement goal saving to database
                  setShowGoalModal(false)
                  handleGoalSaved()
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Edit Modal */}
      {showEditModal && editingMeal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Edit Meal: {editingMeal.name}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Edit the details of this meal.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Food Items:</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {editingMeal.food_items?.map(item => (
                  <li key={item.id} style={{ 
                    padding: '0.5rem', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '0.375rem', 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{item.name} ({item.quantity} {item.unit})</span>
                    <span style={{ fontWeight: '600' }}>{item.calories} kcal</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingMeal(null)
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement meal editing functionality
                  alert('Meal editing functionality coming soon!')
                  setShowEditModal(false)
                  setEditingMeal(null)
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard