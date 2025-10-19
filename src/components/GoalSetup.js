import React, { useState, useEffect } from 'react';
import { CheckIcon, FlagIcon, PencilIcon, BugAntIcon } from '@heroicons/react/24/outline';
import { db } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import aiService from '../services/aiService';

const GoalSetup = () => {
  const { user, profile } = useAuth();
  const [goalData, setGoalData] = useState({
    goalType: null,
    intensity: null,
    userWeight: null,
    userHeight: null,
    userHeightFeet: null,
    userHeightInches: null,
    activityLevel: null,
    bodyType: null,
    sex: null,
    age: null,
    bodyFatPercent: null,
    calculatedTargets: null
  });
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [goalsCalculated, setGoalsCalculated] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [saveStartTime, setSaveStartTime] = useState(null);

  const goalTypes = [
    {
      id: 'fat_loss',
      name: 'Fat Loss (Cut)',
      description: 'Reduce body fat while maintaining muscle',
      icon: '🔥'
    },
    {
      id: 'muscle_gain',
      name: 'Muscle Gain (Bulk)',
      description: 'Build muscle mass and strength',
      icon: '💪'
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      description: 'Maintain current body composition',
      icon: '⚖️'
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Optimize for athletic performance',
      icon: '🏃'
    }
  ];

  const intensities = [
    { id: 'conservative', name: 'Conservative', description: 'Slow and steady approach' },
    { id: 'moderate', name: 'Moderate', description: 'Balanced approach' },
    { id: 'aggressive', name: 'Aggressive', description: 'Fast results, more challenging' }
  ];

  const activityLevels = [
    { id: 'sedentary', name: 'Sedentary', description: 'Little to no exercise' },
    { id: 'light', name: 'Light Activity', description: 'Light exercise 1-3 days/week' },
    { id: 'moderate', name: 'Moderate Activity', description: 'Moderate exercise 3-5 days/week' },
    { id: 'active', name: 'Active', description: 'Heavy exercise 6-7 days/week' },
    { id: 'very_active', name: 'Very Active', description: 'Very heavy exercise, physical job' }
  ];

  const bodyTypes = [
    { 
      id: 'ectomorph', 
      name: 'Ectomorph', 
      description: 'Naturally thin, hard to gain weight',
      characteristics: 'Fast metabolism, lean build'
    },
    { 
      id: 'mesomorph', 
      name: 'Mesomorph', 
      description: 'Athletic build, gains muscle easily',
      characteristics: 'Naturally muscular, responds well to training'
    },
    { 
      id: 'endomorph', 
      name: 'Endomorph', 
      description: 'Naturally heavier, gains weight easily',
      characteristics: 'Slower metabolism, stores fat easily'
    }
  ];

  const sexOptions = [
    { id: 'male', name: 'Male' },
    { id: 'female', name: 'Female' },
    { id: 'non_binary', name: 'Non-binary' }
  ];

  const bodyFatOptions = [
    { 
      id: 'essential', 
      name: 'Essential (3-5%)', 
      description: 'Extreme vascularity; visible striations; "stage-ready" bodybuilding condition. Rarely sustainable.',
      value: 4
    },
    { 
      id: 'athletic', 
      name: 'Athletic / Very Lean (6-9%)', 
      description: 'Clearly visible abs, strong vascularity, minimal lower-ab fat.',
      value: 7.5
    },
    { 
      id: 'fit', 
      name: 'Fit / Lean (10-13%)', 
      description: 'Abs visible, but softer; defined arms and chest; light lower-belly fat.',
      value: 11.5
    },
    { 
      id: 'average', 
      name: 'Average / Healthy (14-18%)', 
      description: 'Muscle shape visible but no ab definition; small love handles or lower-belly fat.',
      value: 16
    },
    { 
      id: 'slightly_overweight', 
      name: 'Slightly Overweight (19-24%)', 
      description: 'Noticeable softness around waist, minimal muscle definition.',
      value: 21.5
    },
    { 
      id: 'overweight', 
      name: 'Overweight / Obese (25-30%+)', 
      description: 'Rounder midsection, little visible muscle definition.',
      value: 27.5
    }
  ];

  // Helper functions for height conversion
  const feetInchesToCm = (feet, inches) => {
    return (feet * 12 + inches) * 2.54;
  };

  const cmToFeetInches = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  const canCalculate = () => {
    return goalData.goalType && goalData.intensity && goalData.userWeight && 
           (goalData.userHeight || (goalData.userHeightFeet && goalData.userHeightInches)) && 
           goalData.activityLevel && goalData.bodyType && goalData.sex && goalData.age;
  };

  const canSave = () => {
    return goalsCalculated && goalData.calculatedTargets;
  };

  // Load current goal on component mount
  useEffect(() => {
    loadCurrentGoal();
  }, []);

  // Pre-populate form with profile data when profile is available and no current goal
  useEffect(() => {
    if (profile && !currentGoal && !isEditing) {
      // Convert height from cm to feet/inches for display
      const { feet, inches } = profile.height_cm ? cmToFeetInches(profile.height_cm) : { feet: null, inches: null };
      
      setGoalData(prev => ({
        ...prev,
        userWeight: profile.weight_kg ? (profile.weight_kg * 2.20462).toString() : null, // Convert kg to lbs
        userHeightFeet: feet?.toString(),
        userHeightInches: inches?.toString(),
        activityLevel: profile.activity_level,
        goalType: profile.fitness_goal, // Map fitness_goal to goalType
        age: profile.age?.toString()
      }));
    }
  }, [profile, currentGoal, isEditing]);

  const loadCurrentGoal = async () => {
    if (!user) return;
    
    try {
      const userId = user.id;
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const goal = await db.getDailyGoals(userId, today);
      if (goal) {
        setCurrentGoal(goal);
      }
    } catch (error) {
      console.error('Error loading current goal:', error);
    }
  };

  const handleEditGoal = () => {
    setIsEditing(true);
    setGoalsCalculated(false);
    
    // Pre-populate form with current goal data if available
    if (currentGoal && currentGoal.goal_config) {
      // Convert height from cm to feet/inches for display
      const heightInCm = currentGoal.goal_config.user_height;
      const { feet, inches } = heightInCm ? cmToFeetInches(heightInCm) : { feet: null, inches: null };
      
      setGoalData({
        goalType: currentGoal.goal_config.goal_type,
        intensity: currentGoal.goal_config.intensity,
        userWeight: currentGoal.goal_config.user_weight?.toString(),
        userHeight: currentGoal.goal_config.user_height?.toString(),
        userHeightFeet: feet?.toString(),
        userHeightInches: inches?.toString(),
        activityLevel: currentGoal.goal_config.activity_level,
        bodyType: currentGoal.goal_config.body_type,
        sex: currentGoal.goal_config.sex,
        age: currentGoal.goal_config.age?.toString(),
        bodyFatPercent: currentGoal.goal_config.body_fat_percent,
        calculatedTargets: currentGoal.goal_config.calculated_targets
      });
      setGoalsCalculated(true); // If we have calculated targets, mark as calculated
    } else {
      // If no current goal, pre-populate with profile data
      if (profile) {
        const { feet, inches } = profile.height_cm ? cmToFeetInches(profile.height_cm) : { feet: null, inches: null };
        
        setGoalData({
          goalType: profile.fitness_goal,
          intensity: null,
          userWeight: profile.weight_kg ? (profile.weight_kg * 2.20462).toString() : null,
          userHeight: null,
          userHeightFeet: feet?.toString(),
          userHeightInches: inches?.toString(),
          activityLevel: profile.activity_level,
          bodyType: null,
          sex: null,
          age: profile.age?.toString(),
          bodyFatPercent: null,
          calculatedTargets: null
        });
      } else {
        setGoalData({
          goalType: null,
          intensity: null,
          userWeight: null,
          userHeight: null,
          userHeightFeet: null,
          userHeightInches: null,
          activityLevel: null,
          bodyType: null,
          sex: null,
          age: null,
          bodyFatPercent: null,
          calculatedTargets: null
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setGoalsCalculated(false);
    setGoalData({
      goalType: null,
      intensity: null,
      userWeight: null,
      userHeight: null,
      userHeightFeet: null,
      userHeightInches: null,
      activityLevel: null,
      bodyType: null,
      sex: null,
      age: null,
      bodyFatPercent: null,
      calculatedTargets: null
    });
  };

  const handleCalculateGoals = async () => {
    if (!canCalculate()) return;

    setCalculating(true);
    setError(null);

    try {
      // Convert height to cm for AI
      let heightInCm;
      if (goalData.userHeightFeet && goalData.userHeightInches) {
        heightInCm = feetInchesToCm(parseFloat(goalData.userHeightFeet), parseFloat(goalData.userHeightInches));
      } else if (goalData.userHeight) {
        heightInCm = parseFloat(goalData.userHeight);
      } else {
        throw new Error('Height is required');
      }

      // Prepare data for AI
      const aiInputData = {
        goalType: goalData.goalType,
        intensity: goalData.intensity,
        userWeight: parseFloat(goalData.userWeight),
        userHeight: heightInCm,
        activityLevel: goalData.activityLevel,
        bodyType: goalData.bodyType,
        sex: goalData.sex,
        age: parseInt(goalData.age),
        bodyFatPercent: goalData.bodyFatPercent
      };

      // Debug: Store input data
      if (debugMode) {
        setDebugData({
          input: aiInputData,
          timestamp: new Date().toISOString(),
          step: 'before_ai_call'
        });
      }

      console.log('🤖 Calling AI with data:', aiInputData);

      // Additional context for AI (you can customize this)
      const additionalContext = {
        // Add any additional context here that might help the AI make better recommendations
        // Examples:
        // "dietary_restrictions": "vegetarian",
        // "training_schedule": "5 days per week",
        // "previous_experience": "beginner",
        // "health_conditions": "none",
        // "preferred_foods": "Mediterranean diet",
        // "time_constraints": "meal prep friendly"
      };

      // Call AI service with timeout
      const calculatedTargets = await Promise.race([
        aiService.calculateGoalTargets(aiInputData, additionalContext, debugMode),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI service request timed out')), 45000) // 45 second timeout
        )
      ]);

      // Debug: Store AI response
      if (debugMode) {
        setDebugData(prev => ({
          ...prev,
          aiResponse: calculatedTargets,
          step: 'after_ai_call'
        }));
      }

      console.log('🎯 AI returned targets:', calculatedTargets);

      // Update state with calculated targets
      setGoalData(prev => ({
        ...prev,
        calculatedTargets
      }));

      setGoalsCalculated(true);

    } catch (err) {
      console.error('Error calculating goals:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to calculate goals: ';
      if (err.message.includes('API key is not configured')) {
        errorMessage += 'OpenAI API key is not configured. Please contact support.';
      } else if (err.message.includes('timed out')) {
        errorMessage += 'Request timed out. Please try again.';
      } else if (err.message.includes('Network error')) {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!canSave() || !user) return;

    setLoading(true);
    setError(null);
    setSaveStartTime(Date.now());

    // Add timeout for save operation
    const saveTimeout = setTimeout(() => {
      console.log('GoalSetup: Save operation timeout');
      setError('Save operation timed out. Please try again.');
      setLoading(false);
    }, 30000); // 30 second timeout

    try {
      const userId = user.id;
      const today = format(new Date(), 'yyyy-MM-dd');

      // Convert height to cm for storage
      let heightInCm;
      if (goalData.userHeightFeet && goalData.userHeightInches) {
        heightInCm = feetInchesToCm(parseFloat(goalData.userHeightFeet), parseFloat(goalData.userHeightInches));
      } else if (goalData.userHeight) {
        heightInCm = parseFloat(goalData.userHeight);
      } else {
        throw new Error('Height is required');
      }

      const goalConfig = {
        goal_type: goalData.goalType,
        intensity: goalData.intensity,
        user_weight: parseFloat(goalData.userWeight),
        user_height: heightInCm,
        activity_level: goalData.activityLevel,
        body_type: goalData.bodyType,
        sex: goalData.sex,
        age: parseInt(goalData.age),
        body_fat_percent: goalData.bodyFatPercent,
        calculated_targets: goalData.calculatedTargets,
        created_at: new Date().toISOString()
      };

      // Create daily goal in database
      const goalToSave = {
        user_id: userId,
        date: today,
        calories_target: Math.round(goalData.calculatedTargets.calories), // Round to integer
        protein_target: Math.round(goalData.calculatedTargets.protein * 100) / 100, // Round to 2 decimal places
        carbs_target: Math.round(goalData.calculatedTargets.carbs * 100) / 100, // Round to 2 decimal places
        fat_target: Math.round(goalData.calculatedTargets.fat * 100) / 100, // Round to 2 decimal places
        goal_config: goalConfig,
        is_active: true
      };

      // Debug: Store final save data
      if (debugMode) {
        setDebugData(prev => ({
          ...prev,
          finalSaveData: goalToSave,
          step: 'before_database_save'
        }));
      }

      console.log('💾 Saving goal to database:', goalToSave);
      console.log('⏱️ Save operation started at:', new Date(saveStartTime).toISOString());

      // Check if goal already exists for this user and date
      console.log('🔍 Checking for existing goal...');
      const existingGoal = await db.getDailyGoals(userId, today);
      console.log('📋 Existing goal result:', existingGoal);
      
      if (existingGoal) {
        // Update existing goal
        console.log('📝 Updating existing goal:', existingGoal.id);
        console.log('⏱️ Update operation started at:', new Date().toISOString());
        await db.update('daily_goals', existingGoal.id, goalToSave);
        console.log('✅ Goal updated successfully');
        console.log('⏱️ Update operation completed at:', new Date().toISOString());
      } else {
        // Create new goal
        console.log('➕ Creating new goal');
        console.log('⏱️ Create operation started at:', new Date().toISOString());
        await db.create('daily_goals', goalToSave);
        console.log('✅ Goal created successfully');
        console.log('⏱️ Create operation completed at:', new Date().toISOString());
      }

      alert('Goal set successfully! 🎯 Your nutrition targets are now active.');
      
      // Refresh current goal
      await loadCurrentGoal();
      
      // Reset form and exit edit mode
      setGoalData({
        goalType: null,
        intensity: null,
        userWeight: null,
        userHeight: null,
        userHeightFeet: null,
        userHeightInches: null,
        activityLevel: null,
        bodyType: null,
        sex: null,
        age: null,
        bodyFatPercent: null,
        calculatedTargets: null
      });
      setGoalsCalculated(false);
      setIsEditing(false);

    } catch (err) {
      console.error('Error saving goal:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      setError('Failed to save goal: ' + err.message);
    } finally {
      clearTimeout(saveTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <FlagIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nutrition Goals</h1>
            <p className="text-lg text-gray-600">
              {currentGoal && !isEditing ? 'Your current nutrition targets' : 'Configure your personalized nutrition targets'}
            </p>
          </div>
        </div>
        
        {/* Debug Toggle */}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            debugMode 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <BugAntIcon className="h-5 w-5 mr-2" />
          {debugMode ? 'Debug ON' : 'Debug OFF'}
        </button>
      </div>

      {/* Debug Panel */}
      {debugMode && debugData && (
        <div className="mb-8 bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
          <h3 className="text-lg font-bold text-white mb-4">🐛 Debug Information</h3>
          <div className="space-y-4">
            <div>
              <strong className="text-yellow-400">Step:</strong> {debugData.step}
            </div>
            <div>
              <strong className="text-yellow-400">Timestamp:</strong> {debugData.timestamp}
            </div>
            {debugData.input && (
              <div>
                <strong className="text-yellow-400">Input to AI:</strong>
                <pre className="mt-2 p-3 bg-black rounded overflow-x-auto">
                  {JSON.stringify(debugData.input, null, 2)}
                </pre>
              </div>
            )}
            {debugData.aiResponse && (
              <div>
                <strong className="text-yellow-400">AI Response:</strong>
                <pre className="mt-2 p-3 bg-black rounded overflow-x-auto">
                  {JSON.stringify(debugData.aiResponse, null, 2)}
                </pre>
              </div>
            )}
            {debugData.finalSaveData && (
              <div>
                <strong className="text-yellow-400">Final Database Save:</strong>
                <pre className="mt-2 p-3 bg-black rounded overflow-x-auto">
                  {JSON.stringify(debugData.finalSaveData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Goal Summary */}
      {currentGoal && !isEditing && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CheckIcon className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-green-800">Current Goal</h2>
            </div>
            <button
              onClick={handleEditGoal}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Goal
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{currentGoal.calories_target}</p>
              <p className="text-sm text-gray-600">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{currentGoal.protein_target}g</p>
              <p className="text-sm text-gray-600">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{currentGoal.carbs_target}g</p>
              <p className="text-sm text-gray-600">Carbs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{currentGoal.fat_target}g</p>
              <p className="text-sm text-gray-600">Fat</p>
            </div>
          </div>

          {currentGoal.goal_config && (
            <div className="text-sm text-gray-600">
              <p><strong>Goal Type:</strong> {goalTypes.find(g => g.id === currentGoal.goal_config.goal_type)?.name || currentGoal.goal_config.goal_type}</p>
              <p><strong>Intensity:</strong> {intensities.find(i => i.id === currentGoal.goal_config.intensity)?.name || currentGoal.goal_config.intensity}</p>
              <p><strong>Activity Level:</strong> {activityLevels.find(a => a.id === currentGoal.goal_config.activity_level)?.name || currentGoal.goal_config.activity_level}</p>
            </div>
          )}
        </div>
      )}

      {/* Progress Indicator - only show when editing */}
      {isEditing && (
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${!goalsCalculated ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${!goalsCalculated ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Configure</span>
            </div>
            <div className={`w-8 h-1 ${goalsCalculated ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${goalsCalculated ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${goalsCalculated ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Review & Set</span>
            </div>
          </div>
        </div>
      )}

      {/* Goal Configuration Form - only show when editing or no current goal */}
      {(!currentGoal || isEditing) && (
        <div>
          {/* Profile Data Pre-population Notice */}
          {profile && !currentGoal && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Form Pre-populated with Your Profile Data
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    We've filled in your weight, height, age, activity level, and fitness goal from your profile. 
                    You can adjust any values as needed.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Goal Selection */}
            <div className="space-y-8">
              {/* Goal Type */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">🧩 Goal Type</h2>
                <div className="grid grid-cols-1 gap-3">
                  {goalTypes.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => setGoalData(prev => ({ ...prev, goalType: goal.id }))}
                      className={`p-4 text-left border-2 rounded-lg transition-all ${
                        goalData.goalType === goal.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{goal.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Intensity</h2>
                <div className="space-y-2">
                  {intensities.map((intensity) => (
                    <button
                      key={intensity.id}
                      onClick={() => setGoalData(prev => ({ ...prev, intensity: intensity.id }))}
                      className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                        goalData.intensity === intensity.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{intensity.name}</div>
                      <div className="text-sm text-gray-600">{intensity.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">🏃 Activity Level</h2>
                <div className="space-y-2">
                  {activityLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setGoalData(prev => ({ ...prev, activityLevel: level.id }))}
                      className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                        goalData.activityLevel === level.id
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

              {/* Body Type */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">🧬 Body Type</h2>
                <div className="space-y-2">
                  {bodyTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setGoalData(prev => ({ ...prev, bodyType: type.id }))}
                      className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                        goalData.bodyType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{type.name}</div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.characteristics}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - User Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">📏 Your Stats</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (lbs)
                    </label>
                    <input
                      type="number"
                      value={goalData.userWeight || ''}
                      onChange={(e) => setGoalData(prev => ({ ...prev, userWeight: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your weight"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height
                    </label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={goalData.userHeightFeet || ''}
                          onChange={(e) => setGoalData(prev => ({ ...prev, userHeightFeet: e.target.value }))}
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
                          value={goalData.userHeightInches || ''}
                          onChange={(e) => setGoalData(prev => ({ ...prev, userHeightInches: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10"
                          min="0"
                          max="11"
                        />
                        <label className="block text-xs text-gray-500 mt-1 text-center">Inches</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sex Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sex
                    </label>
                    <div className="space-y-2">
                      {sexOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setGoalData(prev => ({ ...prev, sex: option.id }))}
                          className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                            goalData.sex === option.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{option.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={goalData.age || ''}
                      onChange={(e) => setGoalData(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your age"
                      min="13"
                      max="100"
                    />
                  </div>

                  {/* Body Fat Percentage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Body Fat Percentage (Optional)
                    </label>
                    <div className="space-y-2">
                      {bodyFatOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setGoalData(prev => ({ ...prev, bodyFatPercent: option.value }))}
                          className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                            goalData.bodyFatPercent === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{option.name}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This helps calculate more accurate protein targets based on lean body mass.
                    </p>
                  </div>
                </div>
              </div>

              {/* Calculated Goals Display */}
              {goalsCalculated && goalData.calculatedTargets && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-4">🎯 Your Calculated Goals</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{Math.round(goalData.calculatedTargets.calories)}</p>
                      <p className="text-sm text-gray-600">Calories</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{Math.round(goalData.calculatedTargets.protein)}g</p>
                      <p className="text-sm text-gray-600">Protein</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{Math.round(goalData.calculatedTargets.carbs)}g</p>
                      <p className="text-sm text-gray-600">Carbs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{Math.round(goalData.calculatedTargets.fat)}g</p>
                      <p className="text-sm text-gray-600">Fat</p>
                    </div>
                  </div>

                  {goalData.calculatedTargets.recommendations && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 Recommendations</h4>
                      <div className="space-y-2 text-sm text-blue-800">
                        {goalData.calculatedTargets.recommendations.meal_timing && (
                          <p><strong>Meal Timing:</strong> {goalData.calculatedTargets.recommendations.meal_timing}</p>
                        )}
                        {goalData.calculatedTargets.recommendations.hydration && (
                          <p><strong>Hydration:</strong> {goalData.calculatedTargets.recommendations.hydration}</p>
                        )}
                        {goalData.calculatedTargets.recommendations.supplements && goalData.calculatedTargets.recommendations.supplements.length > 0 && (
                          <p><strong>Supplements:</strong> {goalData.calculatedTargets.recommendations.supplements.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {goalData.calculatedTargets.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">AI Explanation:</span> {goalData.calculatedTargets.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

              {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {!goalsCalculated ? (
                <div className="flex flex-col items-center space-y-4">
                  <button
                    onClick={handleCalculateGoals}
                    disabled={!canCalculate() || calculating}
                    className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
                  >
                    {calculating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <FlagIcon className="h-5 w-5 mr-2" />
                        Calculate Goals
                      </>
                    )}
                  </button>
                  
                  {/* Fallback option for when AI is not available */}
                  <button
                    onClick={() => {
                      // Set basic calculated targets without AI
                      const basicTargets = {
                        calories: 2000,
                        protein: 150,
                        carbs: 200,
                        fat: 80,
                        bmr: 1600,
                        tdee: 2000,
                        lean_body_mass: 140,
                        goal_timeframe_weeks: 12,
                        recommendations: {
                          meal_timing: "Eat 3-4 meals per day with protein at each meal",
                          hydration: "Drink 8-10 glasses of water daily",
                          supplements: ["Multivitamin", "Omega-3"],
                          tips: ["Track your food intake", "Stay consistent with your goals"]
                        },
                        explanation: "Basic nutrition targets set. For personalized recommendations, ensure your OpenAI API key is configured."
                      };
                      
                      setGoalData(prev => ({
                        ...prev,
                        calculatedTargets: basicTargets
                      }));
                      setGoalsCalculated(true);
                    }}
                    disabled={!canCalculate()}
                    className="flex items-center px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Use Basic Targets
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setGoalsCalculated(false);
                      setGoalData({ ...goalData, calculatedTargets: null });
                    }}
                    className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-lg font-medium transition-colors"
                  >
                    Recalculate
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!canSave() || loading}
                    className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                        Setting Goal...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5 mr-2" />
                        {isEditing ? 'Update Goal' : 'Set Goal & Start Tracking'}
                      </>
                    )}
                  </button>
                  {isEditing && (
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
    </div>
  );
};

export default GoalSetup;