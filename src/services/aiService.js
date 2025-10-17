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
  "food_name": "Standardized food name",
  "description": "Cleaned description",
  "confidence_score": 0.85,
  "nutrition": {
    "calories": 250,
    "protein": 15.5,
    "carbs": 30.2,
    "fat": 8.1,
    "fiber": 3.2,
    "sugar": 12.1,
    "sodium": 450
  },
  "serving_info": {
    "quantity": 1,
    "unit": "serving",
    "weight_grams": 150
  },
  "breakdown": {
    "ingredients": ["chicken breast", "rice", "vegetables"],
    "cooking_method": "grilled",
    "preparation": "home cooked"
  },
  "suggestions": {
    "alternatives": ["baked chicken", "quinoa instead of rice"],
    "improvements": ["add more vegetables", "reduce sodium"]
  },
  "allergens": ["none"],
  "dietary_flags": ["gluten_free", "high_protein"]
}

Be precise with nutritional values. Consider:
- Cooking methods affect calories (grilled vs fried)
- Portion sizes matter significantly
- Common serving sizes and realistic estimates
- User's dietary goals and restrictions

Respond ONLY with valid JSON, no additional text.`
  }

  // Call OpenAI API
  async callOpenAI(prompt) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  // Parse and validate the AI response
  parseNutritionResponse(response) {
    try {
      const parsed = JSON.parse(response)
      
      // Validate required fields
      if (!parsed.food_name || !parsed.nutrition) {
        throw new Error('Invalid AI response structure')
      }

      // Ensure numeric values
      const nutrition = parsed.nutrition
      Object.keys(nutrition).forEach(key => {
        nutrition[key] = parseFloat(nutrition[key]) || 0
      })

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
}

export default new AIService()
