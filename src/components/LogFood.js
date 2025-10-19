import React, { useState } from 'react';
import { PlusIcon, SparklesIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { db } from '../lib/supabase';
import { format } from 'date-fns';

const LogFood = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mealType, setMealType] = useState('breakfast');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      setError('Please describe what you ate.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call OpenAI API to analyze the food
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a nutrition analysis AI. When given a description of food, return a JSON object with:
              - meal_name: A descriptive name for the meal
              - total_calories: Estimated total calories
              - total_protein: Estimated protein in grams
              - total_carbs: Estimated carbohydrates in grams
              - total_fat: Estimated fat in grams
              - food_items: Array of individual food items with name, calories, protein, carbs, fat, quantity, unit
              
              Example: "I had 2 scrambled eggs with a slice of whole wheat toast and half an avocado"
              Return only valid JSON.`
            },
            {
              role: 'user',
              content: input
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const nutritionData = JSON.parse(data.choices[0].message.content);
      
      setResult({
        ...nutritionData,
        original_input: input,
        meal_type: mealType,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error analyzing food:', err);
      setError('Failed to analyze food. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setLoading(true);
    setError(null);

    try {
      const userId = 'afdf6385-70a3-4c7b-ad25-2ce1640efe6d'; // Real user ID
      const dateStr = format(new Date(), 'yyyy-MM-dd');

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
          ai_data: {
            original_description: item.name,
            confidence_score: 0.9,
            estimation_method: 'openai_gpt35',
            user_confirmed: true
          }
        });
      }

      // Reset form
      setInput('');
      setResult(null);
      alert('Food logged successfully!');

    } catch (err) {
      console.error('Error saving food:', err);
      setError('Failed to save food. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field, value) => {
    setResult(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditItem = (index, field, value) => {
    setResult(prev => ({
      ...prev,
      food_items: prev.food_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
        Log Food
      </h1>
      
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Describe what you ate in natural language and we'll analyze the nutrition for you.
      </p>

      {/* Input Form */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              What did you eat?
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 'I had 2 scrambled eggs with a slice of whole wheat toast and half an avocado for breakfast'"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                minHeight: '100px',
                resize: 'vertical'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Meal Type:
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
              disabled={loading}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease-in-out'
            }}
          >
            {loading ? (
              <>
                <div style={{ 
                  width: '1rem', 
                  height: '1rem', 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  marginRight: '0.5rem'
                }} />
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Analyze Food
              </>
            )}
          </button>
        </form>

        {error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '0.375rem', 
            color: '#dc2626' 
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
            Analysis Results
          </h2>

          {/* Meal Summary */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '0.375rem', 
            marginBottom: '1rem' 
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              {result.meal_name}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Calories:</span>
                <span style={{ fontWeight: '600', marginLeft: '0.25rem' }}>{result.total_calories}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Protein:</span>
                <span style={{ fontWeight: '600', marginLeft: '0.25rem' }}>{result.total_protein}g</span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Carbs:</span>
                <span style={{ fontWeight: '600', marginLeft: '0.25rem' }}>{result.total_carbs}g</span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Fat:</span>
                <span style={{ fontWeight: '600', marginLeft: '0.25rem' }}>{result.total_fat}g</span>
              </div>
            </div>
          </div>

          {/* Food Items */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Food Items:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.food_items.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.25rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                    {item.name} ({item.quantity} {item.unit})
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {item.calories} cal
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setResult(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <XMarkIcon style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                backgroundColor: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <CheckIcon style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
              Save Food
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogFood;
