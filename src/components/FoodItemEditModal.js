import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { db } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FoodItemEditModal = ({ isOpen, onClose, foodItem, onSave, onDelete }) => {
  const { user } = useAuth();
  const [editedItem, setEditedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (foodItem) {
      setEditedItem({
        ...foodItem,
        calories: foodItem.calories || 0,
        protein: foodItem.protein || 0,
        carbs: foodItem.carbs || 0,
        fat: foodItem.fat || 0,
        quantity: foodItem.quantity || 1
      });
    }
  }, [foodItem]);

  const handleInputChange = (field, value) => {
    setEditedItem(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleSaveCorrection = async () => {
    if (!user || !editedItem) return;

    setLoading(true);
    setError(null);

    try {
      // Save the correction to the database
      const correctionData = {
        food_name: editedItem.name,
        original_calories: foodItem.original_calories || foodItem.calories,
        original_protein: foodItem.original_protein || foodItem.protein,
        original_carbs: foodItem.original_carbs || foodItem.carbs,
        original_fat: foodItem.original_fat || foodItem.fat,
        corrected_calories: editedItem.calories,
        corrected_protein: editedItem.protein,
        corrected_carbs: editedItem.carbs,
        corrected_fat: editedItem.fat,
        correction_reason: 'User manual adjustment'
      };

      await db.saveFoodCorrection(user.id, correctionData);

      // Update the food item with corrected values
      const updatedItem = {
        ...editedItem,
        has_correction: true,
        original_calories: foodItem.original_calories || foodItem.calories,
        original_protein: foodItem.original_protein || foodItem.protein,
        original_carbs: foodItem.original_carbs || foodItem.carbs,
        original_fat: foodItem.original_fat || foodItem.fat
      };

      setSuccessMessage('Correction saved! This will apply to future meals.');
      setTimeout(() => setSuccessMessage(''), 3000);

      onSave(updatedItem);
    } catch (error) {
      console.error('Error saving correction:', error);
      setError('Failed to save correction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToOriginal = () => {
    if (foodItem.original_calories !== undefined) {
      setEditedItem(prev => ({
        ...prev,
        calories: foodItem.original_calories,
        protein: foodItem.original_protein,
        carbs: foodItem.original_carbs,
        fat: foodItem.original_fat
      }));
    }
  };

  const handleDeleteCorrection = async () => {
    if (!user || !editedItem) return;

    setLoading(true);
    setError(null);

    try {
      // Delete the correction from the database
      await db.deleteFoodCorrection(user.id, editedItem.name);

      // Reset to original values
      const resetItem = {
        ...editedItem,
        calories: foodItem.original_calories || foodItem.calories,
        protein: foodItem.original_protein || foodItem.protein,
        carbs: foodItem.original_carbs || foodItem.carbs,
        fat: foodItem.original_fat || foodItem.fat,
        has_correction: false
      };

      setSuccessMessage('Correction removed!');
      setTimeout(() => setSuccessMessage(''), 3000);

      onSave(resetItem);
    } catch (error) {
      console.error('Error deleting correction:', error);
      setError('Failed to delete correction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!editedItem) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Edit Food Item
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{editedItem.name}</h4>
                  <p className="text-xs text-gray-500">Adjust the nutrition values below</p>
                </div>

                <div className="space-y-4">
                  {/* Calories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={editedItem.calories}
                      onChange={(e) => handleInputChange('calories', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.1"
                    />
                  </div>

                  {/* Protein */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      value={editedItem.protein}
                      onChange={(e) => handleInputChange('protein', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.1"
                    />
                  </div>

                  {/* Carbs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={editedItem.carbs}
                      onChange={(e) => handleInputChange('carbs', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.1"
                    />
                  </div>

                  {/* Fat */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      value={editedItem.fat}
                      onChange={(e) => handleInputChange('fat', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.1"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={editedItem.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    {successMessage}
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6">
                  <div className="flex space-x-2">
                    {editedItem.has_correction && (
                      <button
                        onClick={handleResetToOriginal}
                        className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Reset
                      </button>
                    )}
                    
                    {editedItem.has_correction && (
                      <button
                        onClick={handleDeleteCorrection}
                        disabled={loading}
                        className="flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        Remove Correction
                      </button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCorrection}
                      disabled={loading}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Save Correction
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FoodItemEditModal;
