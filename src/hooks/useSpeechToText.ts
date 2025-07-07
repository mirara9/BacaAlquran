import { useState, useCallback } from 'react'
import { UseSpeechToTextReturn, SpeechToTextResult } from '@/types'
import { blobToBase64, retry } from '@/lib/utils'

interface UseSpeechToTextOptions {
  provider?: 'openai' | 'google' | 'azure' | 'browser'
  language?: string
  model?: string
  apiKey?: string
  onResult?: (result: SpeechToTextResult) => void
  onError?: (error: string) => void
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const {
    provider = 'browser', // Default to browser Web Speech API for now
    language = 'ar-SA',
    model = 'whisper-1',
    onResult,
    onError
  } = options

  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<SpeechToTextResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Browser Web Speech API implementation with real-time support
  const processBrowserSpeech = useCallback(async (audioBlob: Blob): Promise<SpeechToTextResult> => {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Browser speech recognition not supported'))
        return
      }

      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language
      recognition.maxAlternatives = 3

      let finalTranscript = ''
      let confidence = 0

      recognition.onresult = (event) => {
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          confidence = event.results[i][0].confidence || 0.8
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // For real-time feedback, we'll use interim results too
        const currentTranscript = finalTranscript + interimTranscript
        
        if (currentTranscript.trim()) {
          const words = currentTranscript.trim().split(' ').map((word, index) => ({
            word: word.trim(),
            confidence: Math.round(confidence * 100),
            startTime: index * 0.5,
            endTime: (index + 1) * 0.5
          }))

          const result: SpeechToTextResult = {
            transcript: currentTranscript.trim(),
            confidence: Math.round(confidence * 100),
            words: words,
            language: language,
            alternativeTranscripts: []
          }

          // Call onResult for real-time updates if available
          onResult?.(result)
        }
      }

      recognition.onend = () => {
        const words = finalTranscript.trim().split(' ').map((word, index) => ({
          word: word.trim(),
          confidence: Math.round(confidence * 100),
          startTime: index * 0.5,
          endTime: (index + 1) * 0.5
        }))

        const result: SpeechToTextResult = {
          transcript: finalTranscript.trim(),
          confidence: Math.round(confidence * 100),
          words: words,
          language: language,
          alternativeTranscripts: []
        }

        resolve(result)
      }

      recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`))
      }

      // Start recognition directly for live audio
      recognition.start()
      
      // Auto-stop after 10 seconds for this demo
      setTimeout(() => {
        recognition.stop()
      }, 10000)
    })
  }, [language, onResult])

  // OpenAI Whisper API implementation
  const processOpenAISpeech = useCallback(async (audioBlob: Blob): Promise<SpeechToTextResult> => {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', model)
      formData.append('language', language.split('-')[0]) // 'ar' from 'ar-SA'
      formData.append('response_format', 'verbose_json')
      formData.append('timestamp_granularities[]', 'word')

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        transcript: data.text || '',
        confidence: Math.round((data.confidence || 0.8) * 100),
        words: data.words?.map((word: any) => ({
          word: word.word,
          confidence: Math.round((word.confidence || 0.8) * 100),
          startTime: word.start || 0,
          endTime: word.end || 0
        })) || [],
        language: data.language || language,
        alternativeTranscripts: []
      }
    } catch (err) {
      throw new Error(`OpenAI processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [language, model, options.apiKey])

  // Google Cloud Speech-to-Text implementation
  const processGoogleSpeech = useCallback(async (audioBlob: Blob): Promise<SpeechToTextResult> => {
    try {
      const audioBase64 = await blobToBase64(audioBlob)
      const audioContent = audioBase64.split(',')[1] // Remove data:audio/webm;base64, prefix

      const requestBody = {
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: language,
          maxAlternatives: 3,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          model: 'latest_long',
          useEnhanced: true
        },
        audio: {
          content: audioContent
        }
      }

      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${options.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`)
      }

      const data = await response.json()
      const alternatives = data.results?.[0]?.alternatives || []
      const primary = alternatives[0]

      if (!primary) {
        throw new Error('No transcription results')
      }

      return {
        transcript: primary.transcript || '',
        confidence: Math.round((primary.confidence || 0.8) * 100),
        words: primary.words?.map((word: any) => ({
          word: word.word,
          confidence: Math.round((word.confidence || 0.8) * 100),
          startTime: parseFloat(word.startTime?.replace('s', '') || '0'),
          endTime: parseFloat(word.endTime?.replace('s', '') || '0')
        })) || [],
        language: language,
        alternativeTranscripts: alternatives.slice(1).map((alt: any) => alt.transcript)
      }
    } catch (err) {
      throw new Error(`Google processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [language, options.apiKey])

  // Mock implementation for development
  const processMockSpeech = useCallback(async (audioBlob: Blob): Promise<SpeechToTextResult> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock Arabic response
    const mockTranscripts = [
      'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
      'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      'الرَّحْمَنِ الرَّحِيمِ',
      'مَالِكِ يَوْمِ الدِّينِ'
    ]

    const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)]
    const words = transcript.split(' ')

    return {
      transcript,
      confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
      words: words.map((word, index) => ({
        word,
        confidence: Math.floor(Math.random() * 20) + 80,
        startTime: index * 0.5,
        endTime: (index + 1) * 0.5
      })),
      language: language,
      alternativeTranscripts: [
        transcript.replace(/الله/g, 'الله'),
        transcript.replace(/الرحمن/g, 'الرحمان')
      ]
    }
  }, [language])

  // Main processing function
  const processAudio = useCallback(async (audioBlob: Blob): Promise<SpeechToTextResult> => {
    try {
      setIsProcessing(true)
      setError(null)

      let processingFunction: (blob: Blob) => Promise<SpeechToTextResult>

      switch (provider) {
        case 'openai':
          if (!options.apiKey) {
            throw new Error('OpenAI API key required')
          }
          processingFunction = processOpenAISpeech
          break
        case 'google':
          if (!options.apiKey) {
            throw new Error('Google API key required')
          }
          processingFunction = processGoogleSpeech
          break
        case 'browser':
          processingFunction = processBrowserSpeech
          break
        default:
          // Use mock for development
          processingFunction = processMockSpeech
          break
      }

      // Retry with exponential backoff
      const speechResult = await retry(() => processingFunction(audioBlob), 3, 1000)

      setResult(speechResult)
      onResult?.(speechResult)

      return speechResult

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech processing failed'
      setError(errorMessage)
      onError?.(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [
    provider,
    options.apiKey,
    processOpenAISpeech,
    processGoogleSpeech,
    processBrowserSpeech,
    processMockSpeech,
    onResult,
    onError
  ])

  return {
    isProcessing,
    result,
    error,
    processAudio
  }
}