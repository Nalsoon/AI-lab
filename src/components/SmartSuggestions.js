import React, { useState, useEffect } from 'react'
import { 
  LightBulbIcon, 
  ClockIcon, 
  FireIcon,
  BoltIcon,
  ScaleIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import aiService from '../services/aiService'

const SmartSuggestions = ({ userGoals, mealType, preferences = {}, onSuggestionSelect }) => {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [quickActions, setQuickActions] = useState([])

  useEffect(() => {
    loadSuggestions()
    loadQuickActions()
  }, [userGoals, mealType, preferences])

  const loadSuggestions = async () => {
    if (!userGoals) return

    setIsLoading(true)
    try {
      const suggestionsData = await aiService.getFoodSuggestions(
        userGoals,
        mealType,
        preferences
      )
      setSuggestions(suggestionsData.suggestions || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadQuickActions = () => {
    const actions = [
      {
        id: 'quick_breakfast',
        name: 'Quick Breakfast',
        description: 'Fast morning meal',
        icon: ClockIcon,
        color: 'yellow',
        suggestions: [
          'Greek yogurt with berries',
          'Oatmeal with banana',
          'Scrambled eggs with toast'
        ]
      },
      {
        id: 'high_protein',
        name: 'High Protein',
        description: 'Protein-rich options',
        icon: BoltIcon,
        color: 'blue',
        suggestions: [
          'Grilled chicken breast',
          'Salmon with quinoa',
          'Protein smoothie'
        ]
      },
      {
        id: 'low_calorie',
        name: 'Low Calorie',
        description: 'Light meal options',
        icon: FireIcon,
        color: 'green',
        suggestions: [
          'Large salad with lean protein',
          'Vegetable soup',
          'Grilled fish with vegetables'
        ]
      },
      {
        id: 'balanced',
        name: 'Balanced Meal',
        description: 'Complete nutrition',
        icon: ScaleIcon,
        color: 'purple',
        suggestions: [
          'Chicken, rice, and vegetables',
          'Salmon with sweet potato',
          'Turkey wrap with side salad'
        ]
      }
    ]
    setQuickActions(actions)
  }

  const getMacroProgress = () => {
    if (!userGoals) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    
    // This would come from actual daily intake
    const currentIntake = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    
    return {
      calories: Math.round((currentIntake.calories / userGoals.calories_target) * 100),
      protein: Math.round((currentIntake.protein / userGoals.protein_target) * 100),
      carbs: Math.round((currentIntake.carbs / userGoals.carbs_target) * 100),
      fat: Math.round((currentIntake.fat / userGoals.fat_target) * 100)
    }
  }

  const getRemainingTargets = () => {
    if (!userGoals) return null
    
    const progress = getMacroProgress()
    
    return {
      calories: Math.max(0, userGoals.calories_target - (userGoals.calories_target * progress.calories / 100)),
      protein: Math.max(0, userGoals.protein_target - (userGoals.protein_target * progress.protein / 100)),
      carbs: Math.max(0, userGoals.carbs_target - (userGoals.carbs_target * progress.carbs / 100)),
      fat: Math.max(0, userGoals.fat_target - (userGoals.fat_target * progress.fat / 100))
    }
  }

  const getSuggestionScore = (suggestion) => {
    if (!userGoals) return 0
    
    let score = 0
    const remaining = getRemainingTargets()
    
    // Score based on remaining targets
    if (suggestion.estimated_calories <= remaining.calories * 1.2) score += 30
    if (suggestion.key_benefits?.includes('high protein') && remaining.protein > 20) score += 25
    if (suggestion.key_benefits?.includes('low carb') && remaining.carbs < 50) score += 20
    if (suggestion.key_benefits?.includes('healthy fats') && remaining.fat > 10) score += 15
    
    return Math.min(score, 100)
  }

  const categories = [
    { id: 'all', name: 'All', icon: SparklesIcon },
    { id: 'quick', name: 'Quick', icon: ClockIcon },
    { id: 'protein', name: 'High Protein', icon: BoltIcon },
    { id: 'light', name: 'Light', icon: FireIcon },
    { id: 'balanced', name: 'Balanced', icon: ScaleIcon }
  ]

  const filteredSuggestions = suggestions.filter(suggestion => {
    if (activeCategory === 'all') return true
    if (activeCategory === 'quick') return suggestion.preparation?.includes('quick')
    if (activeCategory === 'protein') return suggestion.key_benefits?.includes('high protein')
    if (activeCategory === 'light') return suggestion.estimated_calories < 400
    if (activeCategory === 'balanced') return suggestion.key_benefits?.includes('balanced')
    return true
  })

  const MacroProgressBar = ({ label, current, target, color }) => {
    const percentage = Math.min((current / target) * 100, 100)
    
    return (
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-600">
            {Math.round(current)} / {target}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-${color}-500 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Macro Progress */}
      {userGoals && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <HeartIcon className="h-5 w-5 mr-2" />
            Today's Progress
          </h3>
          <div className="space-y-2">
            <MacroProgressBar 
              label="Calories" 
              current={0} 
              target={userGoals.calories_target} 
              color="red" 
            />
            <MacroProgressBar 
              label="Protein" 
              current={0} 
              target={userGoals.protein_target} 
              color="blue" 
            />
            <MacroProgressBar 
              label="Carbs" 
              current={0} 
              target={userGoals.carbs_target} 
              color="green" 
            />
            <MacroProgressBar 
              label="Fat" 
              current={0} 
              target={userGoals.fat_target} 
              color="yellow" 
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => onSuggestionSelect?.(action.suggestions[0])}
                className={`p-3 rounded-lg border-2 border-transparent hover:border-${action.color}-300 transition-colors text-left`}
              >
                <div className="flex items-center mb-2">
                  <Icon className={`h-5 w-5 text-${action.color}-500 mr-2`} />
                  <span className="font-medium text-gray-900">{action.name}</span>
                </div>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Smart Suggestions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2" />
            Smart Suggestions
          </h3>
          <div className="text-sm text-gray-500">
            {filteredSuggestions.length} options
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {category.name}
              </button>
            )
          })}
        </div>

        {/* Suggestions List */}
        <div className="space-y-3">
          {filteredSuggestions.map((suggestion, index) => {
            const score = getSuggestionScore(suggestion)
            return (
              <div
                key={index}
                onClick={() => onSuggestionSelect?.(suggestion.description)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{suggestion.name}</h4>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">
                      {suggestion.estimated_calories} cal
                    </span>
                    {score > 70 && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {suggestion.key_benefits?.map((benefit, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {benefit}
                    </span>
                  ))}
                </div>
                
                {suggestion.preparation && (
                  <p className="text-xs text-gray-500">
                    💡 {suggestion.preparation}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <LightBulbIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No suggestions available for this category</p>
            <p className="text-sm">Try a different category or check your goals</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SmartSuggestions
