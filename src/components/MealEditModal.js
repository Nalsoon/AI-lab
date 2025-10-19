import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import { db } from '../lib/supabase';
import aiService from '../services/aiService';

const MealEditModal = ({ isOpen, onClose, meal, onSave, onDelete }) => {
  const [editMode, setEditMode] = useState('overview'); // 'overview', 'natural', 'manual'
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedMeal, setEditedMeal] = useState(null);
  const [error, setError] = useState(null);
  const [recalculatedTotals, setRecalculatedTotals] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (meal && isOpen) {
      setEditedMeal(meal);
      // Pre-populate natural language input with original description
      setNaturalLanguageInput(meal.meal_data?.original_input || '');
    }
  }, [meal, isOpen]);

  // Function to recalculate totals based on current food items
  const recalculateMealTotals = (foodItems) => {
    if (!foodItems || foodItems.length === 0) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
    }

    return foodItems.reduce((totals, item) => ({
      calories: totals.calories + (parseFloat(item.calories) || 0),
      protein: totals.protein + (parseFloat(item.protein) || 0),
      carbs: totals.carbs + (parseFloat(item.carbs) || 0),
      fat: totals.fat + (parseFloat(item.fat) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Recalculate totals whenever editedMeal changes
  useEffect(() => {
    if (editedMeal && editedMeal.food_items) {
      const newTotals = recalculateMealTotals(editedMeal.food_items);
      setRecalculatedTotals(newTotals);
    }
  }, [editedMeal]);

  const handleNaturalLanguageEdit = async () => {
    if (!naturalLanguageInput.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Use AI service to re-analyze the natural language input
      const result = await aiService.processFoodDescription(naturalLanguageInput, {
        mealType: meal.meal_type,
        userGoals: {},
        previousFoods: []
      });

      console.log('🤖 AI Natural Language Result:', result);

      // Validate AI result
      if (!result || !result.food_items || !Array.isArray(result.food_items)) {
        console.error('❌ Invalid AI response structure:', result);
        throw new Error('Invalid AI response: missing food_items array');
      }

      console.log('✅ AI response validation passed');
      console.log('🍽️ Food items breakdown:', result.food_items);

      // Process food items with AI data
      const processedFoodItems = result.food_items.map(item => ({
        ...item,
        ai_data: {
          confidence_score: result.confidence_score || 0.5,
          original_description: naturalLanguageInput,
          estimation_method: 'openai_gpt4',
          user_confirmed: false
        }
      }));

      console.log('📋 Processed food items:', processedFoodItems);

      // Update the meal with new AI analysis
      const updatedMeal = {
        ...meal,
        name: result.meal_name || 'Updated Meal',
        total_calories: result.total_calories || 0,
        total_protein: result.total_protein || 0,
        total_carbs: result.total_carbs || 0,
        total_fat: result.total_fat || 0,
        food_items: processedFoodItems,
        meal_data: {
          ...meal.meal_data,
          original_input: naturalLanguageInput,
          ai_analysis: true,
          timestamp: new Date().toISOString()
        }
      };

      console.log('📝 Updated meal structure:', updatedMeal);
      
      setEditedMeal(updatedMeal);
      setEditMode('overview');
      setSuccessMessage(`Meal successfully re-analyzed with AI! Found ${processedFoodItems.length} food items.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Show success message
      console.log('✅ AI processing completed successfully');
    } catch (err) {
      console.error('Error processing natural language:', err);
      setError('Failed to process natural language input. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEdit = (field, value) => {
    setEditedMeal(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleFoodItemEdit = (index, field, value) => {
    setEditedMeal(prev => {
      const newFoodItems = prev.food_items.map((item, i) => 
        i === index ? { ...item, [field]: parseFloat(value) || 0 } : item
      );
      const newTotals = recalculateMealTotals(newFoodItems);
      
      return {
        ...prev,
        food_items: newFoodItems,
        total_calories: newTotals.calories,
        total_protein: newTotals.protein,
        total_carbs: newTotals.carbs,
        total_fat: newTotals.fat
      };
    });
  };

  const handleDeleteFoodItem = (index) => {
    setEditedMeal(prev => {
      const newFoodItems = prev.food_items.filter((_, i) => i !== index);
      const newTotals = recalculateMealTotals(newFoodItems);
      
      return {
        ...prev,
        food_items: newFoodItems,
        total_calories: newTotals.calories,
        total_protein: newTotals.protein,
        total_carbs: newTotals.carbs,
        total_fat: newTotals.fat
      };
    });
  };

  const handleSave = async () => {
    if (!editedMeal) return;

    try {
      // Update meal in database
      await db.update('meals', meal.id, {
        name: editedMeal.name,
        total_calories: editedMeal.total_calories,
        total_protein: editedMeal.total_protein,
        total_carbs: editedMeal.total_carbs,
        total_fat: editedMeal.total_fat,
        meal_data: editedMeal.meal_data
      });

      // Update food items
      for (const [index, item] of editedMeal.food_items.entries()) {
        if (item.id) {
          // Update existing food item
          await db.update('food_items', item.id, {
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            quantity: item.quantity,
            unit: item.unit
          });
        } else {
          // Create new food item
          await db.create('food_items', {
            meal_id: meal.id,
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            quantity: item.quantity,
            unit: item.unit,
            ai_data: item.ai_data || {}
          });
        }
      }

      onSave(editedMeal);
      onClose();
    } catch (err) {
      console.error('Error saving meal:', err);
      setError('Failed to save changes. Please try again.');
    }
  };

  const handleDeleteMeal = async () => {
    if (!window.confirm('Are you sure you want to delete this meal? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete food items first
      for (const item of meal.food_items || []) {
        if (item.id) {
          await db.delete('food_items', item.id);
        }
      }

      // Delete meal
      await db.delete('meals', meal.id);
      
      onDelete(meal.id);
      onClose();
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError('Failed to delete meal. Please try again.');
    }
  };

  if (!isOpen || !meal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Edit Meal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-6 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setEditMode('overview')}
              className={`px-4 py-2 rounded-lg font-medium ${
                editMode === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setEditMode('natural')}
              className={`px-4 py-2 rounded-lg font-medium ${
                editMode === 'natural'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Natural Language
            </button>
            <button
              onClick={() => setEditMode('manual')}
              className={`px-4 py-2 rounded-lg font-medium ${
                editMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Manual Edit
            </button>
          </div>
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

          {/* Overview Mode */}
          {editMode === 'overview' && editedMeal && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Calories</p>
                    <p className="text-2xl font-bold text-red-700">
                      {recalculatedTotals ? recalculatedTotals.calories : editedMeal.total_calories}
                    </p>
                    {recalculatedTotals && recalculatedTotals.calories !== editedMeal.total_calories && (
                      <p className="text-xs text-red-500 mt-1">Updated from {editedMeal.total_calories}</p>
                    )}
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Protein</p>
                    <p className="text-2xl font-bold text-green-700">
                      {recalculatedTotals ? recalculatedTotals.protein : editedMeal.total_protein}g
                    </p>
                    {recalculatedTotals && recalculatedTotals.protein !== editedMeal.total_protein && (
                      <p className="text-xs text-green-500 mt-1">Updated from {editedMeal.total_protein}g</p>
                    )}
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-600 font-medium">Carbs</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {recalculatedTotals ? recalculatedTotals.carbs : editedMeal.total_carbs}g
                    </p>
                    {recalculatedTotals && recalculatedTotals.carbs !== editedMeal.total_carbs && (
                      <p className="text-xs text-yellow-500 mt-1">Updated from {editedMeal.total_carbs}g</p>
                    )}
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Fat</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {recalculatedTotals ? recalculatedTotals.fat : editedMeal.total_fat}g
                    </p>
                    {recalculatedTotals && recalculatedTotals.fat !== editedMeal.total_fat && (
                      <p className="text-xs text-purple-500 mt-1">Updated from {editedMeal.total_fat}g</p>
                    )}
                  </div>
                </div>
                {recalculatedTotals && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Real-time Updates:</span> Totals automatically recalculate as you edit or remove food items.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Food Items</h3>
                <div className="space-y-2">
                  {editedMeal.food_items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.calories} cal • {item.protein}g P • {item.carbs}g C • {item.fat}g F
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFoodItem(index)}
                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {editedMeal.food_items?.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No food items in this meal</p>
                      <p className="text-sm">Add items using Natural Language mode</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Natural Language Mode */}
          {editMode === 'natural' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your meal in natural language:
                </label>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="e.g., Grilled chicken breast with brown rice and steamed broccoli"
                />
              </div>
              <button
                onClick={handleNaturalLanguageEdit}
                disabled={!naturalLanguageInput.trim() || isProcessing}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Re-analyze with AI'}
              </button>
            </div>
          )}

          {/* Manual Edit Mode */}
          {editMode === 'manual' && editedMeal && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Totals</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                    <input
                      type="number"
                      value={editedMeal.total_calories}
                      onChange={(e) => handleManualEdit('total_calories', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {recalculatedTotals && recalculatedTotals.calories !== editedMeal.total_calories && (
                      <p className="text-xs text-blue-600 mt-1">Auto-calculated: {recalculatedTotals.calories}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedMeal.total_protein}
                      onChange={(e) => handleManualEdit('total_protein', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {recalculatedTotals && recalculatedTotals.protein !== editedMeal.total_protein && (
                      <p className="text-xs text-blue-600 mt-1">Auto-calculated: {recalculatedTotals.protein}g</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedMeal.total_carbs}
                      onChange={(e) => handleManualEdit('total_carbs', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {recalculatedTotals && recalculatedTotals.carbs !== editedMeal.total_carbs && (
                      <p className="text-xs text-blue-600 mt-1">Auto-calculated: {recalculatedTotals.carbs}g</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedMeal.total_fat}
                      onChange={(e) => handleManualEdit('total_fat', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {recalculatedTotals && recalculatedTotals.fat !== editedMeal.total_fat && (
                      <p className="text-xs text-blue-600 mt-1">Auto-calculated: {recalculatedTotals.fat}g</p>
                    )}
                  </div>
                </div>
                {recalculatedTotals && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Auto-calculation:</span> Values are automatically recalculated based on individual food items. You can override them manually if needed.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Food Items</h3>
                  {recalculatedTotals && (
                    <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      <span className="font-medium">Live Updates</span> • Totals auto-recalculate
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {editedMeal.food_items?.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <button
                          onClick={() => handleDeleteFoodItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Calories</label>
                          <input
                            type="number"
                            value={item.calories}
                            onChange={(e) => handleFoodItemEdit(index, 'calories', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Protein</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.protein}
                            onChange={(e) => handleFoodItemEdit(index, 'protein', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Carbs</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.carbs}
                            onChange={(e) => handleFoodItemEdit(index, 'carbs', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fat</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.fat}
                            onChange={(e) => handleFoodItemEdit(index, 'fat', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleDeleteMeal}
            className="flex items-center px-4 py-2 text-red-600 hover:text-red-800 font-medium"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Meal
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealEditModal;
