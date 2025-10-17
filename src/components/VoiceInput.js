import React, { useState, useEffect, useRef } from 'react'
import { 
  MicrophoneIcon, 
  StopIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const VoiceInput = ({ onTranscript, onError, disabled = false }) => {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  
  const recognitionRef = useRef(null)
  const speechSynthesisRef = useRef(null)

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)

    // Check if speech synthesis is supported
    setIsSupported(prev => prev && 'speechSynthesis' in window)

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = () => {
    if (!isSupported || disabled) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      setIsListening(true)
      setInterimTranscript('')
      setFinalTranscript('')
    }

    recognitionRef.current.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)
      setFinalTranscript(prev => prev + final)
      
      if (final) {
        onTranscript(final)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      onError?.(event.error)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      onError?.(error.message)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    // Try to use a more natural voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    )
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  const getStatusText = () => {
    if (!isSupported) return 'Voice input not supported'
    if (disabled) return 'Voice input disabled'
    if (isListening) return 'Listening...'
    return 'Click to start voice input'
  }

  const getStatusColor = () => {
    if (!isSupported || disabled) return 'text-gray-400'
    if (isListening) return 'text-red-500'
    return 'text-blue-500'
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Voice Input Button */}
      <div className="relative">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!isSupported || disabled}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
          } ${(!isSupported || disabled) ? 'bg-gray-400 cursor-not-allowed' : 'cursor-pointer'} shadow-lg`}
        >
          {isListening ? (
            <StopIcon className="h-8 w-8 text-white" />
          ) : (
            <MicrophoneIcon className="h-8 w-8 text-white" />
          )}
        </button>
        
        {/* Listening indicator */}
        {isListening && (
          <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        
        {/* Interim transcript */}
        {interimTranscript && (
          <p className="text-xs text-gray-500 mt-1 italic">
            "{interimTranscript}"
          </p>
        )}
      </div>

      {/* Final transcript display */}
      {finalTranscript && (
        <div className="w-full max-w-md">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>Recognized:</strong> {finalTranscript}
            </p>
          </div>
        </div>
      )}

      {/* Support indicator */}
      {!isSupported && (
        <div className="flex items-center text-xs text-gray-500">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Speech recognition not available
        </div>
      )}

      {/* Voice feedback button */}
      {isSupported && (
        <button
          onClick={() => speak("Voice input ready. Describe what you ate.")}
          className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          <SpeakerWaveIcon className="h-4 w-4 mr-2" />
          Test Voice
        </button>
      )}
    </div>
  )
}

export default VoiceInput
