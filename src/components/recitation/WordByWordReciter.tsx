import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Volume2, Play, Pause, RotateCcw } from 'lucide-react'
import { useRealtimeSpeechRecognition } from '@/hooks/useRealtimeSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useAudioPlayer'
import { cleanArabicText, calculateSimilarity } from '@/lib/utils'
import { AL_FATIHA_WORD_BY_WORD, Word, Verse } from '@/lib/quran/wordByWordData'
import { SpeechRecognitionFallback } from '@/components/SpeechRecognitionFallback'

interface WordStatus {
  wordId: string
  status: 'pending' | 'correct' | 'incorrect' | 'current'
  similarity?: number
  attempts?: number
}

interface RecitationState {
  currentVerseIndex: number
  currentWordIndex: number
  isReciting: boolean
  isPaused: boolean
  wordStatuses: Map<string, WordStatus>
  totalWordsCompleted: number
  currentAttempt: string
}

export function WordByWordReciter() {
  const [state, setState] = useState<RecitationState>({
    currentVerseIndex: 0,
    currentWordIndex: 0,
    isReciting: false,
    isPaused: false,
    wordStatuses: new Map(),
    totalWordsCompleted: 0,
    currentAttempt: ''
  })

  const [recentTranscript, setRecentTranscript] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<string>('')
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { speak } = useTextToSpeech()

  // Get current word and verse
  const currentVerse = AL_FATIHA_WORD_BY_WORD.verses[state.currentVerseIndex]
  const currentWord = currentVerse?.words[state.currentWordIndex]
  const totalWords = AL_FATIHA_WORD_BY_WORD.totalWords

  // Initialize word statuses
  useEffect(() => {
    const initialStatuses = new Map<string, WordStatus>()
    AL_FATIHA_WORD_BY_WORD.verses.forEach(verse => {
      verse.words.forEach(word => {
        initialStatuses.set(word.id, {
          wordId: word.id,
          status: 'pending',
          attempts: 0
        })
      })
    })
    
    // Set first word as current
    if (AL_FATIHA_WORD_BY_WORD.verses.length > 0 && AL_FATIHA_WORD_BY_WORD.verses[0].words.length > 0) {
      const firstWord = AL_FATIHA_WORD_BY_WORD.verses[0].words[0]
      initialStatuses.set(firstWord.id, {
        wordId: firstWord.id,
        status: 'current',
        attempts: 0
      })
    }
    
    setState(prev => ({ ...prev, wordStatuses: initialStatuses }))
  }, [])

  // Clear silence timeout
  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
  }, [])

  // Speech recognition setup
  const speechRecognition = useRealtimeSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      const transcript = result.transcript.trim()
      if (!transcript || !state.isReciting || state.isPaused) return

      clearSilenceTimeout()
      
      setRecentTranscript(transcript)
      handleSpeechResult(transcript)
      
      // Set timeout to clear transcript after silence
      silenceTimeoutRef.current = setTimeout(() => {
        setRecentTranscript('')
        setState(prev => ({ ...prev, currentAttempt: '' }))
      }, 3000)
    },
    onInterimResult: (interimText) => {
      if (!state.isReciting || state.isPaused) return
      
      clearSilenceTimeout()
      setRecentTranscript(interimText)
      
      // Process interim for real-time feedback
      if (interimText.trim()) {
        processInterimSpeech(interimText)
      }
    },
    onStart: () => {
      console.log('🎤 Speech recognition started')
    },
    onEnd: () => {
      console.log('🎤 Speech recognition ended')
    },
    onError: (error) => {
      const ignoredErrors = ['aborted', 'no-speech']
      if (!ignoredErrors.some(ignoredError => error.includes(ignoredError))) {
        console.error('Speech recognition error:', error)
      }
    }
  })

  // Process interim speech for real-time feedback
  const processInterimSpeech = useCallback((interimText: string) => {
    if (!currentWord) return
    
    const similarity = calculateWordSimilarity(interimText, currentWord)
    setDebugInfo(`Interim: "${interimText}" vs "${currentWord.arabic}" = ${similarity}%`)
    
    // Update current word status based on interim results
    if (similarity > 60) {
      setState(prev => {
        const newStatuses = new Map(prev.wordStatuses)
        newStatuses.set(currentWord.id, {
          wordId: currentWord.id,
          status: 'current',
          similarity,
          attempts: (newStatuses.get(currentWord.id)?.attempts || 0)
        })
        return { ...prev, wordStatuses: newStatuses }
      })
    }
  }, [currentWord])

  // Handle final speech result
  const handleSpeechResult = useCallback((transcript: string) => {
    if (!currentWord || !state.isReciting || state.isPaused) return

    const similarity = calculateWordSimilarity(transcript, currentWord)
    setDebugInfo(`Final: "${transcript}" vs "${currentWord.arabic}" = ${similarity}%`)

    setState(prev => {
      const newStatuses = new Map(prev.wordStatuses)
      const currentStatus = newStatuses.get(currentWord.id)
      const attempts = (currentStatus?.attempts || 0) + 1

      // Word recognition threshold
      if (similarity >= 70) {
        // Correct pronunciation
        newStatuses.set(currentWord.id, {
          wordId: currentWord.id,
          status: 'correct',
          similarity,
          attempts
        })

        // Move to next word
        const nextPosition = getNextWordPosition(prev.currentVerseIndex, prev.currentWordIndex)
        if (nextPosition) {
          const nextWord = AL_FATIHA_WORD_BY_WORD.verses[nextPosition.verseIndex].words[nextPosition.wordIndex]
          newStatuses.set(nextWord.id, {
            wordId: nextWord.id,
            status: 'current',
            attempts: 0
          })

          // Play success sound (optional)
          playSuccessSound()

          return {
            ...prev,
            currentVerseIndex: nextPosition.verseIndex,
            currentWordIndex: nextPosition.wordIndex,
            wordStatuses: newStatuses,
            totalWordsCompleted: prev.totalWordsCompleted + 1,
            currentAttempt: ''
          }
        } else {
          // Completed all words
          playCompletionSound()
          return {
            ...prev,
            isReciting: false,
            wordStatuses: newStatuses,
            totalWordsCompleted: prev.totalWordsCompleted + 1,
            currentAttempt: ''
          }
        }
      } else if (similarity >= 40) {
        // Partially correct - give feedback but don't advance
        newStatuses.set(currentWord.id, {
          wordId: currentWord.id,
          status: 'incorrect',
          similarity,
          attempts
        })

        // Play error sound
        playErrorSound()

        return {
          ...prev,
          wordStatuses: newStatuses,
          currentAttempt: transcript
        }
      } else {
        // Incorrect pronunciation
        newStatuses.set(currentWord.id, {
          wordId: currentWord.id,
          status: 'incorrect',
          similarity,
          attempts
        })

        // Play error sound
        playErrorSound()

        return {
          ...prev,
          wordStatuses: newStatuses,
          currentAttempt: transcript
        }
      }
    })
  }, [currentWord, state.isReciting, state.isPaused])

  // Calculate word similarity
  const calculateWordSimilarity = (spoken: string, expected: Word): number => {
    const normalizedSpoken = cleanArabicText(spoken.trim())
    const normalizedExpected = cleanArabicText(expected.arabic.trim())
    
    // Direct similarity
    const directSimilarity = calculateSimilarity(normalizedSpoken, normalizedExpected)
    
    // Check alternative pronunciations
    let bestSimilarity = directSimilarity
    if (expected.alternativePronunciations) {
      expected.alternativePronunciations.forEach(alt => {
        const altSimilarity = calculateSimilarity(normalizedSpoken, cleanArabicText(alt))
        bestSimilarity = Math.max(bestSimilarity, altSimilarity)
      })
    }
    
    // Check if spoken text contains the expected word
    if (normalizedSpoken.includes(normalizedExpected)) {
      bestSimilarity = Math.max(bestSimilarity, 85)
    }
    
    return Math.round(bestSimilarity)
  }

  // Get next word position
  const getNextWordPosition = (verseIndex: number, wordIndex: number) => {
    const verse = AL_FATIHA_WORD_BY_WORD.verses[verseIndex]
    if (!verse) return null

    // Next word in same verse
    if (wordIndex + 1 < verse.words.length) {
      return { verseIndex, wordIndex: wordIndex + 1 }
    }

    // Next verse
    if (verseIndex + 1 < AL_FATIHA_WORD_BY_WORD.verses.length) {
      return { verseIndex: verseIndex + 1, wordIndex: 0 }
    }

    return null // Completed all words
  }

  // Audio feedback functions
  const playSuccessSound = () => {
    // Create a short pleasant beep for correct pronunciation
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  }

  const playErrorSound = () => {
    // Create a gentle error sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 300
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  }

  const playCompletionSound = () => {
    // Create a pleasant completion melody
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const notes = [523, 659, 784] // C, E, G
    
    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.2)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.2 + 0.3)
      
      oscillator.start(audioContext.currentTime + index * 0.2)
      oscillator.stop(audioContext.currentTime + index * 0.2 + 0.3)
    })
  }

  // Control functions
  const startRecitation = () => {
    setState(prev => ({ ...prev, isReciting: true, isPaused: false }))
    speechRecognition.startListening()
  }

  const pauseRecitation = () => {
    setState(prev => ({ ...prev, isPaused: true }))
    speechRecognition.stopListening()
    clearSilenceTimeout()
  }

  const resumeRecitation = () => {
    setState(prev => ({ ...prev, isPaused: false }))
    speechRecognition.startListening()
  }

  const resetRecitation = () => {
    setState(prev => {
      const resetStatuses = new Map<string, WordStatus>()
      AL_FATIHA_WORD_BY_WORD.verses.forEach(verse => {
        verse.words.forEach(word => {
          resetStatuses.set(word.id, {
            wordId: word.id,
            status: 'pending',
            attempts: 0
          })
        })
      })
      
      // Set first word as current
      if (AL_FATIHA_WORD_BY_WORD.verses.length > 0 && AL_FATIHA_WORD_BY_WORD.verses[0].words.length > 0) {
        const firstWord = AL_FATIHA_WORD_BY_WORD.verses[0].words[0]
        resetStatuses.set(firstWord.id, {
          wordId: firstWord.id,
          status: 'current',
          attempts: 0
        })
      }
      
      return {
        currentVerseIndex: 0,
        currentWordIndex: 0,
        isReciting: false,
        isPaused: false,
        wordStatuses: resetStatuses,
        totalWordsCompleted: 0,
        currentAttempt: ''
      }
    })
    
    speechRecognition.stopListening()
    speechRecognition.clearTranscript()
    setRecentTranscript('')
    setDebugInfo('')
    clearSilenceTimeout()
  }

  const playWordAudio = (word: Word) => {
    speak(word.arabic, 'ar-SA')
  }

  const playVerseAudio = (verse: Verse) => {
    const verseText = verse.words.map(w => w.arabic).join(' ')
    speak(verseText, 'ar-SA')
  }

  // Get word status color
  const getWordStatusColor = (wordId: string) => {
    const status = state.wordStatuses.get(wordId)
    switch (status?.status) {
      case 'correct':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'incorrect':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-800">
            سُورَةُ الْفَاتِحَة
            <span className="block text-lg font-normal text-gray-600 mt-2">
              Surah Al-Fatiha - Word by Word Practice
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Speech Recognition Component */}
            <SpeechRecognitionFallback
              onTranscript={handleSpeechResult}
              onError={(error) => {
                if (!error.includes('aborted')) {
                  console.error('Speech recognition error:', error)
                }
              }}
              language="ar-SA"
              continuous={true}
            />
            
            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!state.isReciting ? (
                <Button onClick={startRecitation} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Start Recitation
                </Button>
              ) : state.isPaused ? (
                <Button onClick={resumeRecitation} className="bg-blue-600 hover:bg-blue-700">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button onClick={pauseRecitation} className="bg-yellow-600 hover:bg-yellow-700">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              
              <Button onClick={resetRecitation} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Progress */}
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">
                Progress: {state.totalWordsCompleted} / {totalWords} words
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(state.totalWordsCompleted / totalWords) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Word Display */}
            {currentWord && state.isReciting && (
              <div className="text-center bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">Currently expecting:</p>
                <div className="text-4xl font-arabic mb-2" dir="rtl">
                  {currentWord.arabic}
                </div>
                <div className="text-sm text-gray-600">
                  {currentWord.transliteration}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentWord.translation}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playWordAudio(currentWord)}
                  className="mt-2"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Debug Info */}
            {debugInfo && (
              <div className="text-xs text-gray-500 text-center">
                {debugInfo}
              </div>
            )}

            {/* Recent Transcript */}
            {recentTranscript && (
              <div className="text-center bg-gray-50 p-2 rounded">
                <p className="text-sm text-gray-600">Hearing: "{recentTranscript}"</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verses with Word-by-Word Display */}
      <div className="space-y-4">
        {AL_FATIHA_WORD_BY_WORD.verses.map((verse, verseIndex) => (
          <Card key={verse.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-green-800">
                  Verse {verse.id}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playVerseAudio(verse)}
                  className="text-green-700 hover:text-green-800"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Words Grid */}
              <div className="flex flex-wrap gap-2 mb-4" dir="rtl">
                {verse.words.map((word, wordIndex) => (
                  <motion.div
                    key={word.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: wordIndex * 0.1 }}
                  >
                    <div
                      className={`
                        inline-block px-3 py-2 rounded-lg border-2 cursor-pointer
                        transition-all duration-300 hover:shadow-md
                        ${getWordStatusColor(word.id)}
                      `}
                      onClick={() => playWordAudio(word)}
                    >
                      <div className="text-2xl font-arabic mb-1">
                        {word.arabic}
                      </div>
                      <div className="text-xs text-center">
                        {word.transliteration}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Verse Translation */}
              <div className="text-center text-sm text-gray-600 mt-4">
                <p className="italic mb-1">{verse.transliteration}</p>
                <p>{verse.translation}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Message */}
      {state.totalWordsCompleted === totalWords && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl text-green-700 font-semibold mb-2">
                🎉 Excellent! You've completed Al-Fatiha!
              </p>
              <p className="text-green-600">
                You successfully recited all {totalWords} words with proper pronunciation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}