import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const ProfileSetup = ({ isOpen, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    height_feet: '',
    height_inches: '',
    weight: '',
    activity_level: '',
    fitness_goal: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Physical Stats, 3: Goals

  const { user, createProfile } = useAuth();

  const activityLevels = [
    { id: 'sedentary', name: 'Sedentary', description: 'Little to no exercise' },
    { id: 'light', name: 'Light Activity', description: 'Light exercise 1-3 days/week' },
    { id: 'moderate', name: 'Moderate Activity', description: 'Moderate exercise 3-5 days/week' },
    { id: 'active', name: 'Active', description: 'Heavy exercise 6-7 days/week' },
    { id: 'very_active', name: 'Very Active', description: 'Very heavy exercise, physical job' }
  ];

  const fitnessGoals = [
    { id: 'fat_loss', name: 'Fat Loss', description: 'Reduce body fat while maintaining muscle' },
    { id: 'muscle_gain', name: 'Muscle Gain', description: 'Build muscle mass and strength' },
    { id: 'maintenance', name: 'Maintenance', description: 'Maintain current body composition' },
    { id: 'performance', name: 'Performance', description: 'Optimize for athletic performance' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert height to cm
      const heightInCm = (parseInt(formData.height_feet) * 12 + parseInt(formData.height_inches)) * 2.54;

      const profileData = {
        id: user.id, // Add the user ID
        full_name: formData.full_name,
        age: parseInt(formData.age),
        height_cm: heightInCm,
        weight_kg: parseFloat(formData.weight) * 0.453592, // Convert lbs to kg
        activity_level: formData.activity_level,
        fitness_goal: formData.fitness_goal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating profile with data:', profileData);
      console.log('User ID:', user.id);
      console.log('User object:', user);
      
      const { error } = await createProfile(profileData);
      
      if (error) {
        console.error('Profile creation error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setError(error.message);
      } else {
        console.log('Profile created successfully');
        onComplete();
        onClose();
      }
    } catch (err) {
      console.error('Profile creation failed:', err);
      setError('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name.trim() !== '';
      case 2:
        return formData.age && formData.height_feet && formData.height_inches && formData.weight;
      case 3:
        return formData.activity_level && formData.fitness_goal;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Let's get to know you!</h3>
              <p className="text-gray-600">First, tell us your name so we can personalize your experience.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Physical Stats</h3>
              <p className="text-gray-600">Help us calculate your personalized nutrition targets.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25"
                  min="13"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="150"
                  min="50"
                  max="500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={formData.height_feet}
                    onChange={(e) => handleInputChange('height_feet', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="5"
                    min="3"
                    max="8"
                  />
                  <label className="block text-xs text-gray-500 mt-1 text-center">Feet</label>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={formData.height_inches}
                    onChange={(e) => handleInputChange('height_inches', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10"
                    min="0"
                    max="11"
                  />
                  <label className="block text-xs text-gray-500 mt-1 text-center">Inches</label>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity & Goals</h3>
              <p className="text-gray-600">Tell us about your lifestyle and fitness goals.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Activity Level
              </label>
              <div className="space-y-2">
                {activityLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => handleInputChange('activity_level', level.id)}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      formData.activity_level === level.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{level.name}</div>
                    <div className="text-sm text-gray-600">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Fitness Goal
              </label>
              <div className="space-y-2">
                {fitnessGoals.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => handleInputChange('fitness_goal', goal.id)}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      formData.fitness_goal === goal.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{goal.name}</div>
                    <div className="text-sm text-gray-600">{goal.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
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
                    <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
                    <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                      Set Up Your Profile
                    </Dialog.Title>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Step {step} of 3</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3].map((stepNum) => (
                        <div
                          key={stepNum}
                          className={`w-2 h-2 rounded-full ${
                            stepNum <= step ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      {error}
                    </div>
                  )}

                  {renderStep()}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={step === 1}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      Back
                    </button>

                    {step < 3 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canProceed() || loading}
                        className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                            Creating Profile...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-5 w-5 mr-2" />
                            Complete Setup
                          </>
                        )}
                      </button>
                    )}
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

export default ProfileSetup;
