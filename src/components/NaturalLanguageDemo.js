import React, { useState } from 'react'
import { 
  PlayIcon, 
  PauseIcon,
  ArrowPathIcon,
  SparklesIcon,
  MicrophoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

const NaturalLanguageDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [demoText, setDemoText] = useState('')

  const demoSteps = [
    {
      title: "Natural Language Input",
      description: "Describe your meal in plain English",
      example: "I had a large grilled chicken breast with brown rice and steamed broccoli for lunch",
      features: ["Voice input support", "Natural language processing", "Context awareness"]
    },
    {
      title: "AI Nutrition Analysis",
      description: "Get instant nutritional breakdown",
      example: "Chicken Breast with Rice and Broccoli - 450 calories, 35g protein, 45g carbs, 8g fat",
      features: ["Accurate calorie estimation", "Macro breakdown", "Confidence scoring"]
    },
    {
      title: "Smart Suggestions",
      description: "Get personalized food recommendations",
      example: "Based on your goals, try: Grilled salmon with quinoa, Greek yogurt with berries",
      features: ["Goal-based suggestions", "Dietary preferences", "Quick meal ideas"]
    },
    {
      title: "Conversational Interface",
      description: "Chat-like experience for food logging",
      example: "You: 'I'm still hungry' → AI: 'Try adding a protein shake or some nuts'",
      features: ["Conversational flow", "Contextual responses", "Learning from history"]
    }
  ]

  const startDemo = () => {
    setIsPlaying(true)
    setCurrentStep(0)
    setDemoText('')
    playStep(0)
  }

  const playStep = (stepIndex) => {
    if (stepIndex >= demoSteps.length) {
      setIsPlaying(false)
      return
    }

    setCurrentStep(stepIndex)
    const step = demoSteps[stepIndex]
    
    // Simulate typing effect
    let text = ''
    const fullText = step.example
    let index = 0

    const typeEffect = () => {
      if (index < fullText.length) {
        text += fullText[index]
        setDemoText(text)
        index++
        setTimeout(typeEffect, 50)
      } else {
        // Wait before next step
        setTimeout(() => {
          playStep(stepIndex + 1)
        }, 2000)
      }
    }

    typeEffect()
  }

  const stopDemo = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    setDemoText('')
  }

  const currentStepData = demoSteps[currentStep] || demoSteps[0]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Natural Language Food Logging Demo</h1>
        <p className="text-gray-600 mt-2">
          Experience the power of AI-powered nutrition tracking with natural language
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo Interface */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Interactive Demo</h2>
            <div className="flex space-x-2">
              {!isPlaying ? (
                <button
                  onClick={startDemo}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Start Demo
                </button>
              ) : (
                <button
                  onClick={stopDemo}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PauseIcon className="h-4 w-4 mr-2" />
                  Stop Demo
                </button>
              )}
            </div>
          </div>

          {/* Demo Chat Interface */}
          <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
            <div className="space-y-4">
              {/* User Input */}
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-xs">
                  <p className="text-sm">I had a large grilled chicken breast with brown rice and steamed broccoli for lunch</p>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg max-w-xs">
                  <div className="flex items-center mb-2">
                    <SparklesIcon className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">AI Analysis</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {demoText ? (
                      <div>
                        <p className="font-medium">Chicken Breast with Rice and Broccoli</p>
                        <p className="text-gray-600">450 calories | 35g protein | 45g carbs | 8g fat</p>
                        <p className="text-xs text-green-600 mt-1">Confidence: 92%</p>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Click "Start Demo" to see AI analysis...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              {currentStep >= 2 && (
                <div className="flex justify-start">
                  <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg max-w-xs">
                    <div className="flex items-center mb-2">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-900">Smart Suggestions</span>
                    </div>
                    <div className="text-sm text-green-800">
                      <p>Based on your goals, try:</p>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        <li>Grilled salmon with quinoa</li>
                        <li>Greek yogurt with berries</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voice Input Demo */}
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                  <MicrophoneIcon className="h-6 w-6" />
                </button>
                {isPlaying && currentStep === 0 && (
                  <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-ping"></div>
                )}
              </div>
              <span className="text-sm text-gray-600">
                {isPlaying && currentStep === 0 ? 'Listening...' : 'Voice input ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Steps */}
        <div className="space-y-6">
          {demoSteps.map((step, index) => (
            <div
              key={index}
              className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                currentStep === index
                  ? 'border-blue-500 bg-blue-50'
                  : currentStep > index
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                  currentStep === index
                    ? 'bg-blue-500 text-white'
                    : currentStep > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > index ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 mb-3">{step.description}</p>
                  
                  {currentStep === index && (
                    <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                      <p className="text-sm text-gray-700 italic">"{step.example}"</p>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {step.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Features */}
      <div className="mt-12 bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MicrophoneIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Voice Input</h4>
            <p className="text-sm text-gray-600">Hands-free food logging with speech recognition</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <SparklesIcon className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">AI Analysis</h4>
            <p className="text-sm text-gray-600">Instant nutritional breakdown with confidence scoring</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Smart Suggestions</h4>
            <p className="text-sm text-gray-600">Personalized recommendations based on your goals</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NaturalLanguageDemo
