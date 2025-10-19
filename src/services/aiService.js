// AI Service for Natural Language Food Processing
// Handles OpenAI integration for food estimation and nutrition analysis

class AIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY
    this.baseURL = 'https://api.openai.com/v1'
  }

  // Main method to process natural language food descriptions
  async processFoodDescription(description, context = {}) {
    try {
      const prompt = this.buildNutritionPrompt(description, context)
      const response = await this.callOpenAI(prompt)
      return this.parseNutritionResponse(response)
    } catch (error) {
      console.error('AI Service Error:', error)
      throw new Error('Failed to process food description. Please try again.')
    }
  }

  // Build the prompt for OpenAI
  buildNutritionPrompt(description, context) {
    const { mealType = 'meal', userGoals = {}, previousFoods = [] } = context
    
    return `You are a nutrition expert AI. Analyze this food description and provide accurate nutritional information.

FOOD DESCRIPTION: "${description}"

CONTEXT:
- Meal Type: ${mealType}
- User Goals: ${JSON.stringify(userGoals)}
- Previous Foods Today: ${previousFoods.join(', ')}

Please provide a JSON response with the following structure:
{
  "meal_name": "Descriptive meal name",
  "meal_type": "breakfast/lunch/dinner/snack",
  "total_calories": 450,
  "total_protein": 25.5,
  "total_carbs": 35.2,
  "total_fat": 18.1,
  "food_items": [
    {
      "name": "Grilled Chicken Breast",
      "calories": 200,
      "protein": 20.0,
      "carbs": 0,
      "fat": 8.0,
      "quantity": 1,
      "unit": "piece"
    },
    {
      "name": "Brown Rice",
      "calories": 150,
      "protein": 3.0,
      "carbs": 30.0,
      "fat": 1.0,
      "quantity": 0.5,
      "unit": "cup"
    },
    {
      "name": "Steamed Broccoli",
      "calories": 50,
      "protein": 2.5,
      "carbs": 5.2,
      "fat": 0.1,
      "quantity": 1,
      "unit": "cup"
    }
  ],
  "original_input": "User's original description",
  "timestamp": "2024-01-01T12:00:00Z"
}

Be precise with nutritional values. Consider:
- Cooking methods affect calories (grilled vs fried)
- Portion sizes matter significantly
- Common serving sizes and realistic estimates
- User's dietary goals and restrictions
- Break down complex meals into individual food components
- Each food item should have realistic portion sizes and nutrition values
- Ensure total_calories, total_protein, total_carbs, total_fat match the sum of food_items

IMPORTANT: Break down the meal into individual food items. For example:
- "2 scrambled eggs with toast and avocado" should become 3 separate food items
- "Chicken stir-fry with rice and vegetables" should become separate items for chicken, rice, and vegetables

Respond ONLY with valid JSON, no additional text.`
  }

  // Call OpenAI API
  async callOpenAI(prompt, debugMode = false) {
    // Check if API key is available
    if (!this.apiKey || this.apiKey === 'your-openai-api-key-here') {
      throw new Error('OpenAI API key is not configured. Please set REACT_APP_OPENAI_API_KEY in your environment variables.');
    }

    const requestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a nutrition expert AI that provides accurate, detailed nutritional analysis of food descriptions. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    };

    if (debugMode) {
      console.log('🤖 OpenAI API Request:', {
        url: `${this.baseURL}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey.substring(0, 20)}...`,
          'Content-Type': 'application/json'
        },
        body: requestBody
      });
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (debugMode) {
        console.log('🤖 OpenAI API Response:', {
          usage: data.usage,
          model: data.model,
          response: data.choices[0].message.content
        });
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API request timed out. Please try again.');
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  }

  // Parse and validate the AI response
  parseNutritionResponse(response) {
    try {
      const parsed = JSON.parse(response)
      
      // Validate required fields
      if (!parsed.meal_name || !parsed.food_items || !Array.isArray(parsed.food_items)) {
        throw new Error('Invalid AI response structure')
      }

      // Ensure numeric values for totals
      parsed.total_calories = parseFloat(parsed.total_calories) || 0
      parsed.total_protein = parseFloat(parsed.total_protein) || 0
      parsed.total_carbs = parseFloat(parsed.total_carbs) || 0
      parsed.total_fat = parseFloat(parsed.total_fat) || 0

      // Ensure numeric values for food items
      parsed.food_items = parsed.food_items.map(item => ({
        ...item,
        calories: parseFloat(item.calories) || 0,
        protein: parseFloat(item.protein) || 0,
        carbs: parseFloat(item.carbs) || 0,
        fat: parseFloat(item.fat) || 0,
        quantity: parseFloat(item.quantity) || 1
      }))

      // Set confidence score
      parsed.confidence_score = Math.min(Math.max(parsed.confidence_score || 0.5, 0), 1)

      return {
        ...parsed,
        timestamp: new Date().toISOString(),
        ai_model: 'gpt-4',
        processing_time: Date.now()
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw new Error('Invalid response from AI service')
    }
  }

  // Get food suggestions based on user goals
  async getFoodSuggestions(userGoals, mealType, preferences = {}) {
    const prompt = `Based on these user goals: ${JSON.stringify(userGoals)}
    For ${mealType}, suggest 3 healthy food options that would fit their nutrition targets.
    
    Consider:
    - Calorie targets: ${userGoals.calories || 'flexible'}
    - Protein goals: ${userGoals.protein || 'moderate'}
    - Dietary preferences: ${JSON.stringify(preferences)}
    
    Provide JSON response with:
    {
      "suggestions": [
        {
          "name": "Food name",
          "description": "Brief description",
          "estimated_calories": 300,
          "key_benefits": ["high protein", "low carb"],
          "preparation": "Quick cooking method"
        }
      ]
    }`

    try {
      const response = await this.callOpenAI(prompt)
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to get food suggestions:', error)
      return { suggestions: [] }
    }
  }

  // Analyze meal balance and provide recommendations
  async analyzeMealBalance(meals, userGoals) {
    const totalNutrition = meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.nutrition?.calories || 0),
      protein: acc.protein + (meal.nutrition?.protein || 0),
      carbs: acc.carbs + (meal.nutrition?.carbs || 0),
      fat: acc.fat + (meal.nutrition?.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    const prompt = `Analyze this daily nutrition intake and provide recommendations:

    CURRENT INTAKE:
    - Calories: ${totalNutrition.calories}
    - Protein: ${totalNutrition.protein}g
    - Carbs: ${totalNutrition.carbs}g
    - Fat: ${totalNutrition.fat}g

    USER GOALS:
    - Target Calories: ${userGoals.calories}
    - Target Protein: ${userGoals.protein}g
    - Target Carbs: ${userGoals.carbs}g
    - Target Fat: ${userGoals.fat}g

    Provide JSON response with:
    {
      "analysis": {
        "calorie_balance": "over/under/balanced",
        "macro_balance": "good/needs_adjustment",
        "protein_sufficiency": "adequate/low/high"
      },
      "recommendations": [
        "Specific actionable advice"
      ],
      "remaining_targets": {
        "calories": 200,
        "protein": 30,
        "carbs": 50,
        "fat": 10
      }
    }`

    try {
      const response = await this.callOpenAI(prompt)
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to analyze meal balance:', error)
      return {
        analysis: { calorie_balance: 'unknown', macro_balance: 'unknown' },
        recommendations: ['Unable to analyze at this time'],
        remaining_targets: userGoals
      }
    }
  }

  // Get nutrition tips and education
  async getNutritionTips(topic = 'general') {
    const prompt = `Provide 3 helpful nutrition tips about ${topic}. 
    Make them practical and actionable for someone tracking their nutrition.
    
    Respond with JSON:
    {
      "tips": [
        {
          "title": "Tip title",
          "description": "Practical advice",
          "category": "nutrition"
        }
      ]
    }`

    try {
      const response = await this.callOpenAI(prompt)
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to get nutrition tips:', error)
      return { tips: [] }
    }
  }

  // Calculate personalized goal targets using AI
  async calculateGoalTargets(goalData, additionalContext = {}, debugMode = false) {
    const prompt = `You are an expert nutritionist and fitness coach. Calculate personalized nutrition targets based on the user's goal configuration. 
    

    USER DATA:
    - Goal Type: ${goalData.goalType}
    - Intensity: ${goalData.intensity}
    - Weight: ${goalData.userWeight} lbs
    - Height: ${goalData.userHeight} cm
    - Age: ${goalData.age} years
    - Sex: ${goalData.sex}
    - Activity Level: ${goalData.activityLevel}
    - Body Type: ${goalData.bodyType}
    - Body Fat Percentage: ${goalData.bodyFatPercent ? goalData.bodyFatPercent + '%' : 'Not provided'}

    Calculate precise targets using these guidelines:
    - Use Mifflin-St Jeor equation for BMR: 
      * Male: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
      * Female: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
      * Non-binary: Use average of male/female formulas
    - TDEE = BMR * activity multiplier (sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9)
    - For fat loss: 10-25% deficit based on intensity
    - For muscle gain: 10-20% surplus based on intensity  
    - For maintenance: 0% change
    - For performance: 0-10% surplus based on intensity
    - Protein calculation:
      * If body fat % provided: LBM = weight_lbs × (1 - body_fat_percent/100), then 0.9-1.1g/lb LBM
      * If no body fat %: 0.8-1.2g/lb total weight (cut slightly higher, bulk slightly lower)
    - Fat: 20-35% of calories based on goal type
    - Carbs: remaining calories after protein and fat
    - Calculate goal timeframe: 8-16 weeks based on intensity and goal type
    
    BODY TYPE CONSIDERATIONS:
    - Ectomorph: Higher carb needs, may need more calories for muscle gain
    - Mesomorph: Balanced approach, responds well to moderate changes
    - Endomorph: Lower carb tolerance, may need more aggressive deficit for fat loss

    PROTEIN LOGIC:
    - If bodyFatPercent is provided, compute Lean Body Mass (LBM). Prefer g/kg of LBM; otherwise use g/lb of total body weight.
    - Base multipliers by goal + intensity (g/kg LBM):
      • fat_loss: gradual 2.2–2.4, moderate 2.4–2.6, aggressive 2.5–2.7
      • maintenance: gradual 1.8–2.0, moderate 1.9–2.1, aggressive 2.0–2.2
      • muscle_gain: gradual 1.6–1.8, moderate 1.7–1.9, aggressive 1.8–2.0
      • performance: gradual 1.6–1.8, moderate 1.7–2.0, aggressive 1.8–2.1
    - Modifiers (+0.1 g/kg each, small and bounded):
      • trainingDaysPerWeek ≥ 4
      • (fat_loss AND lean): male BF% < 15 OR female BF% < 24
      • age ≥ 50
      • If BF% ≥ 25 (male) or ≥ 35 (female), −0.1 g/kg (LBM basis already controls for adiposity).
  - Clamp 1.4 ≤ g/kg LBM ≤ 2.7.
  - If bodyFatPercent is missing, use BW basis:
    • fat_loss ~ 1.0–1.15 g/lb BW, maintenance ~ 0.9–1.0, muscle_gain ~ 0.8–0.95, performance ~ 0.9–1.05; +0.05 g/lb if trainingDaysPerWeek ≥ 4.
  - Soft cap protein to ≤ 40% of total calories on fat_loss, ≤ 35% otherwise. Round to nearest 5 g.


    ${Object.keys(additionalContext).length > 0 ? `
    ADDITIONAL CONTEXT:
    ${Object.entries(additionalContext).map(([key, value]) => `- ${key}: ${value}`).join('\n    ')}
    ` : ''}

    Respond with JSON:
    {
      "calories": target_calories,
      "protein": protein_grams,
      "carbs": carb_grams, 
      "fat": fat_grams,
      "bmr": calculated_bmr,
      "tdee": calculated_tdee,
      "lean_body_mass": lean_body_mass_lbs,
      "goal_timeframe_weeks": timeframe_weeks,
      "recommendations": {
        "meal_timing": "specific meal timing advice",
        "hydration": "daily water intake recommendation",
        "supplements": ["recommended supplements"],
        "tips": ["practical tips for success"]
      },
      "explanation": "brief explanation of the calculation rationale"
    }`

    if (debugMode) {
      console.log('🎯 Goal Calculation Debug:', {
        inputData: goalData,
        prompt: prompt,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const response = await this.callOpenAI(prompt, debugMode)
      const parsed = JSON.parse(response);
      
      if (debugMode) {
        console.log('🎯 AI Goal Response:', {
          rawResponse: response,
          parsedResponse: parsed,
          timestamp: new Date().toISOString()
        });
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to calculate goal targets:', error)
      throw new Error('Failed to calculate goal targets. Please try again.')
    }
  }
}

export default new AIService()
