import { useState, useRef, useCallback, useEffect } from 'react'
import { SpeechToTextResult } from '@/types'

interface UseRealtimeSpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (result: SpeechToTextResult) => void
  onInterimResult?: (transcript: string) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

interface UseRealtimeSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  confidence: number
  error: string | null
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
}

export function useRealtimeSpeechRecognition(
  options: UseRealtimeSpeechRecognitionOptions = {}
): UseRealtimeSpeechRecognitionReturn {
  const {
    language = 'ar-SA',
    continuous = true,
    interimResults = true,
    onResult,
    onInterimResult,
    onError,
    onStart,
    onEnd
  } = options

  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any | null>(null)
  const finalTranscriptRef = useRef('')

  // Check browser support and microphone permissions on mount
  useEffect(() => {
    const checkSupport = async () => {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        setIsSupported(false)
        setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.')
        console.error('SpeechRecognition not available:', {
          speechRecognition: !!(window as any).SpeechRecognition,
          webkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
          userAgent: navigator.userAgent
        })
        return
      }

      // Check if we're on HTTPS or localhost (required for microphone access)
      const isSecureContext = window.isSecureContext || 
        window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'

      if (!isSecureContext) {
        setIsSupported(false)
        setError('Microphone access requires HTTPS or localhost')
        return
      }

      // For now, assume microphone is available if Speech Recognition is supported
      // We'll request actual permission when user tries to start recording
      setIsSupported(true)
      setError(null)
      
      console.log('Speech Recognition setup completed:', {
        hasSpeechRecognition: !!SpeechRecognition,
        isSecureContext,
        userAgent: navigator.userAgent,
        location: window.location.href
      })
    }

    checkSupport()
  }, [])

  const startListening = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Speech recognition not supported in this browser'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    // Explicitly request microphone permission before starting recognition
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) // Stop immediately, we just needed permission
    } catch (err) {
      let errorMsg = 'Microphone access denied'
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Please allow microphone access to use speech recognition'
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No microphone found. Please connect a microphone.'
        } else {
          errorMsg = `Microphone error: ${err.message}`
        }
      }
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = language
    recognition.maxAlternatives = 3

    // Use ref so it persists across re-renders but can be reset

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setIsListening(true)
      setError(null)
      onStart?.()
    }

    recognition.onresult = (event: any) => {
      let interimText = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcriptText = result[0].transcript
        const confidenceScore = result[0].confidence || 0.8

        if (result.isFinal) {
          finalTranscriptRef.current += transcriptText + ' '
          const currentTranscript = finalTranscriptRef.current.trim()
          setTranscript(currentTranscript)
          setConfidence(Math.round(confidenceScore * 100))
          
          // Create structured result for final transcript
          const words = currentTranscript.split(' ').map((word, index) => ({
            word: word.trim(),
            confidence: Math.round(confidenceScore * 100),
            startTime: index * 0.5,
            endTime: (index + 1) * 0.5
          }))

          const speechResult: SpeechToTextResult = {
            transcript: currentTranscript,
            confidence: Math.round(confidenceScore * 100),
            words: words,
            language: language,
            alternativeTranscripts: []
          }

          onResult?.(speechResult)
        } else {
          interimText += transcriptText
        }
      }
      
      setInterimTranscript(interimText)
      onInterimResult?.(interimText)
    }

    recognition.onerror = (event: any) => {
      // Don't show common expected errors that don't require user action
      const ignoredErrors = ['aborted', 'no-speech']
      
      if (!ignoredErrors.includes(event.error)) {
        console.error('Speech recognition error:', event.error)
        const errorMsg = `Speech recognition error: ${event.error}`
        setError(errorMsg)
        onError?.(errorMsg)
        setIsListening(false)
      } else {
        // Just log ignored errors for debugging
        console.log(`Speech recognition ${event.error} (expected during normal operation)`)
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      setIsListening(false)
      onEnd?.()
    }

    recognitionRef.current = recognition
    
    try {
      recognition.start()
    } catch (err) {
      const errorMsg = 'Failed to start speech recognition'
      setError(errorMsg)
      onError?.(errorMsg)
    }
  }, [isSupported, continuous, interimResults, language, onResult, onInterimResult, onError, onStart, onEnd])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    console.log('🧹 Speech recognition transcript cleared')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    clearTranscript
  }
}