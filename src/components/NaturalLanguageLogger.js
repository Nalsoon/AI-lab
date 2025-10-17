import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { 
  MicrophoneIcon, 
  SparklesIcon, 
  CheckIcon, 
  XMarkIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import aiService from '../services/aiService'
import { db } from '../lib/supabase'

const NaturalLanguageLogger = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiEstimation, setAiEstimation] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [loggedFoods, setLoggedFoods] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [tips, setTips] = useState([])
  const [conversationHistory, setConversationHistory] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [userGoals, setUserGoals] = useState(null)
  
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)

  const { register, handleSubmit, reset, watch, setValue } = useForm()
  const foodDescription = watch('description')

  useEffect(() => {
    loadUserGoals()
    loadConversationHistory()
    loadNutritionTips()
  }, [])

  useEffect(() => {
    if (foodDescription && foodDescription.length > 10) {
      debounceGetSuggestions(foodDescription)
    }
  }, [foodDescription])

  const loadUserGoals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const goals = await db.getDailyGoals('user-id', today)
      setUserGoals(goals)
    } catch (error) {
      console.error('Error loading user goals:', error)
    }
  }

  const loadConversationHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const meals = await db.getDailyMeals('user-id', today)
      const history = meals.map(meal => ({
        type: 'meal',
        content: meal.name,
        timestamp: meal.created_at,
        nutrition: {
          calories: meal.total_calories,
          protein: meal.total_protein,
          carbs: meal.total_carbs,
          fat: meal.total_fat
        }
      }))
      setConversationHistory(history)
    } catch (error) {
      console.error('Error loading conversation history:', error)
    }
  }

  const loadNutritionTips = async () => {
    try {
      const tipsData = await aiService.getNutritionTips('meal planning')
      setTips(tipsData.tips || [])
    } catch (error) {
      console.error('Error loading nutrition tips:', error)
    }
  }

  const debounceGetSuggestions = (() => {
    let timeoutId
    return (description) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        getFoodSuggestions(description)
      }, 1000)
    }
  })()

  const getFoodSuggestions = async (description) => {
    if (!description || description.length < 10) return

    try {
      const suggestionsData = await aiService.getFoodSuggestions(
        userGoals || {},
        'lunch',
        { dietary_restrictions: [] }
      )
      setSuggestions(suggestionsData.suggestions || [])
    } catch (error) {
      console.error('Error getting food suggestions:', error)
    }
  }

  const onSubmit = async (data) => {
    if (!data.description.trim()) return

    setIsProcessing(true)
    try {
      const context = {
        mealType: 'lunch',
        userGoals: userGoals || {},
        previousFoods: conversationHistory.slice(-3).map(item => item.content)
      }

      const estimation = await aiService.processFoodDescription(data.description, context)
      setAiEstimation(estimation)
      setIsConfirming(true)
    } catch (error) {
      console.error('Error processing food description:', error)
      alert('Failed to process food description. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const confirmEstimation = async () => {
    if (!aiEstimation) return

    try {
      // Save to database
      const mealData = {
        user_id: 'user-id',
        name: aiEstimation.food_name,
        meal_type: 'lunch',
        date: new Date().toISOString().split('T')[0],
        total_calories: aiEstimation.nutrition.calories,
        total_protein: aiEstimation.nutrition.protein,
        total_carbs: aiEstimation.nutrition.carbs,
        total_fat: aiEstimation.nutrition.fat,
        meal_data: {
          ai_estimation: aiEstimation,
          confidence_score: aiEstimation.confidence_score,
          original_description: foodDescription
        }
      }

      const savedMeal = await db.create('meals', mealData)
      
      // Add to conversation history
      const newEntry = {
        type: 'user_input',
        content: foodDescription,
        timestamp: new Date().toISOString(),
        ai_response: aiEstimation,
        meal_id: savedMeal.id
      }
      
      setConversationHistory(prev => [...prev, newEntry])
      setLoggedFoods(prev => [...prev, { ...aiEstimation, id: savedMeal.id }])
      
      // Reset form
      setAiEstimation(null)
      setIsConfirming(false)
      reset()
    } catch (error) {
      console.error('Error saving meal:', error)
      alert('Failed to save meal. Please try again.')
    }
  }

  const adjustEstimation = (field, value) => {
    if (aiEstimation) {
      setAiEstimation(prev => ({
        ...prev,
        nutrition: {
          ...prev.nutrition,
          [field]: parseFloat(value) || 0
        }
      }))
    }
  }

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setValue('description', transcript)
      setIsListening(false)
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current.start()
  }

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const ConversationBubble = ({ entry, index }) => (
    <div key={index} className={`flex ${entry.type === 'user_input' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        entry.type === 'user_input' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        <p className="text-sm">{entry.content}</p>
        {entry.ai_response && (
          <div className="mt-2 text-xs opacity-75">
            {entry.ai_response.nutrition.calories} cal | 
            P: {entry.ai_response.nutrition.protein}g | 
            C: {entry.ai_response.nutrition.carbs}g | 
            F: {entry.ai_response.nutrition.fat}g
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Natural Language Food Logger</h1>
        <p className="text-gray-600 mt-2">
          Describe what you ate in natural language and get instant nutrition analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Input Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                Today's Food Log
              </h3>
              <div className="max-h-64 overflow-y-auto">
                {conversationHistory.map((entry, index) => (
                  <ConversationBubble key={index} entry={entry} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Food Input Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  What did you eat?
                </label>
                <div className="relative">
                  <textarea
                    {...register('description', { required: true })}
                    ref={textareaRef}
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-20"
                    placeholder="e.g., 'I had a large grilled chicken breast with brown rice and steamed broccoli for lunch'"
                    disabled={isProcessing}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    {isListening ? (
                      <button
                        type="button"
                        onClick={stopVoiceInput}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startVoiceInput}
                        className="p-2 text-gray-600 hover:text-gray-800"
                      >
                        <MicrophoneIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isListening ? 'Listening...' : 'Click microphone for voice input'}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!foodDescription?.trim() || isProcessing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Analyze Nutrition
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <LightBulbIcon className="h-5 w-5 mr-2" />
                AI Suggestions
              </h3>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                       onClick={() => setValue('description', suggestion.description)}>
                    <h4 className="font-medium text-gray-900">{suggestion.name}</h4>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestion.key_benefits?.map((benefit, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Estimation Confirmation */}
          {isConfirming && aiEstimation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <SparklesIcon className="h-6 w-6 text-blue-600 mt-1 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">
                    AI Nutrition Analysis
                  </h3>
                  <p className="text-blue-800 mb-4">
                    Based on "{aiEstimation.description}", here's the nutritional breakdown:
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Calories
                        </label>
                        <input
                          type="number"
                          value={aiEstimation.nutrition.calories}
                          onChange={(e) => adjustEstimation('calories', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Protein (g)
                        </label>
                        <input
                          type="number"
                          value={aiEstimation.nutrition.protein}
                          onChange={(e) => adjustEstimation('protein', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Carbs (g)
                        </label>
                        <input
                          type="number"
                          value={aiEstimation.nutrition.carbs}
                          onChange={(e) => adjustEstimation('carbs', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Fat (g)
                        </label>
                        <input
                          type="number"
                          value={aiEstimation.nutrition.fat}
                          onChange={(e) => adjustEstimation('fat', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={confirmEstimation}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Confirm & Log
                    </button>
                    <button
                      onClick={() => {
                        setAiEstimation(null)
                        setIsConfirming(false)
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <XMarkIcon className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-blue-600">
                    Confidence: {Math.round(aiEstimation.confidence_score * 100)}% | 
                    AI Model: {aiEstimation.ai_model}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nutrition Tips */}
          {tips.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                💡 Nutrition Tips
              </h3>
              <div className="space-y-3">
                {tips.map((tip, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900">{tip.title}</h4>
                    <p className="text-sm text-yellow-800">{tip.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logged Foods Summary */}
          {loggedFoods.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Today's Logged Foods
              </h3>
              <div className="space-y-3">
                {loggedFoods.map((food) => (
                  <div key={food.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{food.food_name}</h4>
                      <p className="text-sm text-gray-600">
                        {food.nutrition.calories} cal | 
                        P: {food.nutrition.protein}g | 
                        C: {food.nutrition.carbs}g | 
                        F: {food.nutrition.fat}g
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {loggedFoods.reduce((sum, food) => sum + food.nutrition.calories, 0)} cal
                    </p>
                    <p className="text-sm text-gray-600">
                      P: {loggedFoods.reduce((sum, food) => sum + food.nutrition.protein, 0).toFixed(1)}g | 
                      C: {loggedFoods.reduce((sum, food) => sum + food.nutrition.carbs, 0).toFixed(1)}g | 
                      F: {loggedFoods.reduce((sum, food) => sum + food.nutrition.fat, 0).toFixed(1)}g
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NaturalLanguageLogger
