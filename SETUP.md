# Nutrition Tracker Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.template .env
   # Edit .env with your actual API keys
   ```

3. **Test the connection:**
   ```bash
   npm run test-connection
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

## Features

- **Natural Language Food Logging**: Describe your meals in plain English
- **AI-Powered Nutrition Analysis**: Get instant calorie and macro breakdowns
- **Voice Input Support**: Hands-free food logging
- **Smart Suggestions**: Personalized food recommendations
- **Goal Tracking**: Daily and monthly nutrition targets
- **Activity Integration**: Strava and Apple Health support

## Database Schema

The application uses Supabase with a flexible JSONB-based schema that supports:
- User profiles and preferences
- Meal and food item tracking
- Goal setting and progress tracking
- Activity data from multiple sources
- Extensible metadata for future features

## API Keys Required

- **Supabase**: Database and authentication
- **OpenAI**: AI-powered nutrition analysis
- **Strava**: Activity tracking (optional)

## Development

The application is built with:
- React 18
- React Router for navigation
- React Query for data fetching
- Tailwind CSS for styling
- Supabase for backend services
