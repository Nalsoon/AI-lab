import React, { useState } from 'react';
import { UserIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    age: profile?.age || '',
    height_cm: profile?.height_cm || '',
    weight_kg: profile?.weight_kg || '',
    activity_level: profile?.activity_level || '',
    fitness_goal: profile?.fitness_goal || ''
  });

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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await updateProfile({
        ...formData,
        updated_at: new Date().toISOString()
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      age: profile?.age || '',
      height_cm: profile?.height_cm || '',
      weight_kg: profile?.weight_kg || '',
      activity_level: profile?.activity_level || '',
      fitness_goal: profile?.fitness_goal || ''
    });
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const formatHeight = (cm) => {
    if (!cm) return 'Not set';
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const formatWeight = (kg) => {
    if (!kg) return 'Not set';
    const lbs = Math.round(kg * 2.20462);
    return `${lbs} lbs`;
  };

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Found</h3>
          <p className="text-gray-600">Please complete your profile setup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.full_name || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="13"
                      max="100"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.age || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Physical Stats */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Physical Stats</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.height_cm}
                      onChange={(e) => handleInputChange('height_cm', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Height in cm"
                    />
                  ) : (
                    <p className="text-gray-900">{formatHeight(profile.height_cm)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.weight_kg}
                      onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Weight in kg"
                    />
                  ) : (
                    <p className="text-gray-900">{formatWeight(profile.weight_kg)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Activity & Goals */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity & Goals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Activity Level
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <p className="text-gray-900">
                      {activityLevels.find(l => l.id === profile.activity_level)?.name || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Fitness Goal
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <p className="text-gray-900">
                      {fitnessGoals.find(g => g.id === profile.fitness_goal)?.name || 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
