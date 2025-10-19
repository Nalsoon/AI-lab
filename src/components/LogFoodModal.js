import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { db } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import aiService from '../services/aiService';
import { format } from 'date-fns';

const LogFoodModal = ({ isOpen, onClose, onMealLogged }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('input'); // 'input', 'review', 'success'
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleProcessFood = async () => {
    if (!naturalLanguageInput.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('🤖 Processing natural language input:', naturalLanguageInput);

      // Use AI service to analyze the natural language input
      const aiResult = await aiService.processFoodDescription(naturalLanguageInput, {
        mealType: 'meal',
        userGoals: {},
        previousFoods: []
      });

      console.log('🤖 AI Natural Language Result:', aiResult);

      // Validate AI result
      if (!aiResult || !aiResult.food_items || !Array.isArray(aiResult.food_items)) {
        console.error('❌ Invalid AI response structure:', aiResult);
        throw new Error('Invalid AI response: missing food_items array');
      }

      console.log('✅ AI response validation passed');
      console.log('🍽️ Food items breakdown:', aiResult.food_items);

      // Process food items with AI data
      const processedFoodItems = aiResult.food_items.map(item => ({
        ...item,
        ai_data: {
          confidence_score: aiResult.confidence_score || 0.5,
          original_description: naturalLanguageInput,
          estimation_method: 'openai_gpt4',
          user_confirmed: false
        }
      }));

      console.log('📋 Processed food items:', processedFoodItems);

      // Set the result and move to review step
      setResult({
        meal_name: aiResult.meal_name || 'New Meal',
        meal_type: aiResult.meal_type || 'meal',
        total_calories: aiResult.total_calories || 0,
        total_protein: aiResult.total_protein || 0,
        total_carbs: aiResult.total_carbs || 0,
        total_fat: aiResult.total_fat || 0,
        food_items: processedFoodItems,
        original_input: naturalLanguageInput,
        timestamp: new Date().toISOString()
      });

      setStep('review');
      console.log('✅ AI processing completed successfully');

    } catch (err) {
      console.error('Error processing natural language:', err);
      setError('Failed to process food description. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!result || !user) return;

    setIsProcessing(true);
    setError(null);

    try {
      const userId = user.id;
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      console.log('💾 Saving meal to database:', result);

      // Create meal entry
      const meal = await db.create('meals', {
        user_id: userId,
        name: result.meal_name,
        meal_type: result.meal_type,
        date: dateStr,
        total_calories: result.total_calories,
        total_protein: result.total_protein,
        total_carbs: result.total_carbs,
        total_fat: result.total_fat,
        meal_data: {
          original_input: result.original_input,
          ai_analysis: true,
          timestamp: result.timestamp
        }
      });

      console.log('✅ Meal created with ID:', meal.id);

      // Create individual food items
      for (const item of result.food_items) {
        await db.create('food_items', {
          meal_id: meal.id,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          quantity: item.quantity,
          unit: item.unit,
          ai_data: item.ai_data
        });
      }

      console.log('✅ Food items created successfully');

      // Show success and close modal
      setStep('success');
      setSuccessMessage(`Meal logged successfully! Found ${result.food_items.length} food items.`);
      
      // Notify parent component
      if (onMealLogged) {
        onMealLogged();
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Error saving meal:', err);
      setError('Failed to save meal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setNaturalLanguageInput('');
    setResult(null);
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleEditItem = (index, field, value) => {
    setResult(prev => ({
      ...prev,
      food_items: prev.food_items.map((item, i) => 
        i === index ? { ...item, [field]: parseFloat(value) || 0 } : item
      )
    }));

    // Recalculate totals
    const updatedItems = result.food_items.map((item, i) => 
      i === index ? { ...item, [field]: parseFloat(value) || 0 } : item
    );
    
    const newTotals = updatedItems.reduce((totals, item) => ({
      calories: totals.calories + (parseFloat(item.calories) || 0),
      protein: totals.protein + (parseFloat(item.protein) || 0),
      carbs: totals.carbs + (parseFloat(item.carbs) || 0),
      fat: totals.fat + (parseFloat(item.fat) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    setResult(prev => ({
      ...prev,
      food_items: updatedItems,
      total_calories: newTotals.calories,
      total_protein: newTotals.protein,
      total_carbs: newTotals.carbs,
      total_fat: newTotals.fat
    }));
  };

  const handleDeleteItem = (index) => {
    const updatedItems = result.food_items.filter((_, i) => i !== index);
    
    const newTotals = updatedItems.reduce((totals, item) => ({
      calories: totals.calories + (parseFloat(item.calories) || 0),
      protein: totals.protein + (parseFloat(item.protein) || 0),
      carbs: totals.carbs + (parseFloat(item.carbs) || 0),
      fat: totals.fat + (parseFloat(item.fat) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    setResult(prev => ({
      ...prev,
      food_items: updatedItems,
      total_calories: newTotals.calories,
      total_protein: newTotals.protein,
      total_carbs: newTotals.carbs,
      total_fat: newTotals.fat
    }));
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
                    <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                      {step === 'input' && 'Log Food'}
                      {step === 'review' && 'Review & Confirm'}
                      {step === 'success' && 'Success!'}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      {error}
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                      {successMessage}
                    </div>
                  )}

                  {/* Input Step */}
                  {step === 'input' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          What did you eat?
                        </label>
                        <textarea
                          value={naturalLanguageInput}
                          onChange={(e) => setNaturalLanguageInput(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          rows={4}
                          placeholder="Describe your meal in natural language...&#10;&#10;Examples:&#10;• 2 scrambled eggs with whole wheat toast and half an avocado&#10;• Grilled chicken breast with brown rice and steamed broccoli&#10;• Protein shake with banana and peanut butter"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleProcessFood}
                          disabled={!naturalLanguageInput.trim() || isProcessing}
                          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="h-5 w-5 mr-2" />
                              Analyze with AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Review Step */}
                  {step === 'review' && result && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {result.meal_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Original: "{result.original_input}"
                        </p>
                      </div>

                      {/* Nutrition Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Nutrition Summary</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{Math.round(result.total_calories)}</p>
                            <p className="text-sm text-gray-600">Calories</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">{Math.round(result.total_protein)}g</p>
                            <p className="text-sm text-gray-600">Protein</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-yellow-600">{Math.round(result.total_carbs)}g</p>
                            <p className="text-sm text-gray-600">Carbs</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{Math.round(result.total_fat)}g</p>
                            <p className="text-sm text-gray-600">Fat</p>
                          </div>
                        </div>
                      </div>

                      {/* Food Items */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Food Items</h5>
                        <div className="space-y-3">
                          {result.food_items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-600">
                                  {item.quantity} {item.unit}
                                </p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">{Math.round(item.calories)} cal</p>
                                  <p className="text-xs text-gray-600">
                                    {Math.round(item.protein)}p / {Math.round(item.carbs)}c / {Math.round(item.fat)}f
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteItem(index)}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Remove item"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setStep('input')}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                        >
                          Back to Edit
                        </button>
                        <button
                          onClick={handleSaveMeal}
                          disabled={isProcessing}
                          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-5 w-5 mr-2" />
                              Log Meal
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Success Step */}
                  {step === 'success' && (
                    <div className="text-center py-8">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <CheckIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Meal Logged Successfully!
                      </h4>
                      <p className="text-gray-600">
                        Your meal has been added to your daily nutrition tracking.
                      </p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LogFoodModal;
