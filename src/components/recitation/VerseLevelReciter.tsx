import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Volume2, Play, Pause, RotateCcw, Mic, CheckCircle, XCircle } from 'lucide-react'
import { useRealtimeSpeechRecognition } from '@/hooks/useRealtimeSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useAudioPlayer'
import { cleanArabicText, calculateSimilarity } from '@/lib/utils'

// Al-Fatiha verses for verse-level recitation
const AL_FATIHA_VERSES = [
  {
    id: 1,
    arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    transliteration: 'Bismillāhi r-raḥmāni r-raḥīm',
    translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
  },
  {
    id: 2,
    arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
    transliteration: 'Al-ḥamdu lillāhi rabbi l-ʿālamīn',
    translation: 'All praise is due to Allah, Lord of the worlds.'
  },
  {
    id: 3,
    arabic: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    transliteration: 'Ar-raḥmāni r-raḥīm',
    translation: 'The Entirely Merciful, the Especially Merciful.'
  },
  {
    id: 4,
    arabic: 'مَالِكِ يَوْمِ الدِّينِ',
    transliteration: 'Māliki yawmi d-dīn',
    translation: 'Sovereign of the Day of Recompense.'
  },
  {
    id: 5,
    arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    transliteration: 'Iyyāka naʿbudu wa-iyyāka nastaʿīn',
    translation: 'It is You we worship and You we ask for help.'
  },
  {
    id: 6,
    arabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    transliteration: 'Ihdinā ṣ-ṣirāṭa l-mustaqīm',
    translation: 'Guide us to the straight path.'
  },
  {
    id: 7,
    arabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    transliteration: 'Ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa-lā ḍ-ḍāllīn',
    translation: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.'
  }
]

interface VerseStatus {
  verseId: number
  status: 'pending' | 'current' | 'completed' | 'failed' | 'processing'
  attempts: number
  accuracy?: number
  lastAttempt?: string
}

interface RecitationState {
  currentVerseIndex: number
  isReciting: boolean
  isListening: boolean
  verseStatuses: Map<number, VerseStatus>
  completedVerses: number
  accumulatedTranscript: string
  recordingStartTime?: number
}

export function VerseLevelReciter() {
  const [state, setState] = useState<RecitationState>({
    currentVerseIndex: 0,
    isReciting: false,
    isListening: false,
    verseStatuses: new Map(),
    completedVerses: 0,
    accumulatedTranscript: ''
  })

  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { speak } = useTextToSpeech()

  // Get current verse
  const currentVerse = AL_FATIHA_VERSES[state.currentVerseIndex]
  const totalVerses = AL_FATIHA_VERSES.length

  // Initialize verse statuses
  useEffect(() => {
    const initialStatuses = new Map<number, VerseStatus>()
    AL_FATIHA_VERSES.forEach(verse => {
      initialStatuses.set(verse.id, {
        verseId: verse.id,
        status: verse.id === 1 ? 'current' : 'pending',
        attempts: 0
      })
    })
    
    setState(prev => ({ ...prev, verseStatuses: initialStatuses }))
  }, [])

  // Clear timeouts
  const clearTimeouts = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
  }, [])

  // Speech recognition setup
  const speechRecognition = useRealtimeSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      if (!state.isListening) return
      
      const transcript = result.transcript.trim()
      console.log('📝 Final transcript received:', transcript)
      
      // Accumulate final transcript (this is the complete recognized text)
      setState(prev => ({ 
        ...prev, 
        accumulatedTranscript: transcript 
      }))
      
      // Clear existing silence timeout
      clearTimeouts()
      
      // Set silence timeout to detect end of verse (3 seconds)
      silenceTimeoutRef.current = setTimeout(() => {
        console.log('🔇 Silence detected - processing verse with transcript:', transcript)
        processVerseRecitation(transcript)
      }, 3000)
    },
    onInterimResult: (interimText) => {
      if (!state.isListening) return
      
      console.log('🎤 Interim transcript:', interimText)
      
      // Clear silence timeout during active speech
      if (silenceTimeoutRef.current && interimText.trim()) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      
      // Show interim results but don't overwrite final transcript
      setState(prev => ({ 
        ...prev, 
        accumulatedTranscript: interimText || prev.accumulatedTranscript
      }))
    },
    onStart: () => {
      console.log('🎤 Speech recognition started successfully')
      setStatusMessage('🎤 Recording... Speak the highlighted verse now.')
    },
    onEnd: () => {
      console.log('🎤 Speech recognition ended')
      if (state.isListening) {
        setStatusMessage('Microphone stopped. Click "Start Recitation" to continue.')
      }
    },
    onError: (error) => {
      const ignoredErrors = ['aborted', 'no-speech']
      if (!ignoredErrors.some(ignoredError => error.includes(ignoredError))) {
        console.error('Speech recognition error:', error)
        setStatusMessage(`Error: ${error}`)
      } else {
        console.log(`Speech recognition ${error} (expected during operation)`)
      }
    }
  })

  // Process complete verse recitation
  const processVerseRecitation = useCallback(async (transcript: string) => {
    if (!currentVerse || !transcript.trim()) {
      console.log('❌ No verse or empty transcript')
      return
    }

    setIsProcessing(true)
    setStatusMessage('Processing your recitation...')
    
    // Stop listening while processing
    setState(prev => ({ ...prev, isListening: false }))
    speechRecognition.stopListening()
    clearTimeouts()

    try {
      // Calculate verse accuracy
      const accuracy = calculateVerseAccuracy(transcript, currentVerse.arabic)
      console.log(`📊 Verse ${currentVerse.id} accuracy: ${accuracy}%`)
      
      const passingThreshold = 75 // 75% accuracy required to pass
      const isCorrect = accuracy >= passingThreshold
      
      // Update verse status
      setState(prev => {
        const newStatuses = new Map(prev.verseStatuses)
        const currentStatus = newStatuses.get(currentVerse.id)
        const attempts = (currentStatus?.attempts || 0) + 1
        
        newStatuses.set(currentVerse.id, {
          verseId: currentVerse.id,
          status: isCorrect ? 'completed' : 'failed',
          attempts,
          accuracy,
          lastAttempt: transcript
        })
        
        let newCurrentVerseIndex = prev.currentVerseIndex
        let newCompletedVerses = prev.completedVerses
        
        if (isCorrect) {
          // Mark current verse as completed and move to next
          newCompletedVerses += 1
          
          // Move to next verse if available
          if (prev.currentVerseIndex + 1 < AL_FATIHA_VERSES.length) {
            newCurrentVerseIndex = prev.currentVerseIndex + 1
            const nextVerse = AL_FATIHA_VERSES[newCurrentVerseIndex]
            newStatuses.set(nextVerse.id, {
              verseId: nextVerse.id,
              status: 'current',
              attempts: 0
            })
          }
        }
        
        return {
          ...prev,
          verseStatuses: newStatuses,
          currentVerseIndex: newCurrentVerseIndex,
          completedVerses: newCompletedVerses,
          accumulatedTranscript: ''
        }
      })
      
      // Provide feedback
      if (isCorrect) {
        setStatusMessage(`✅ Verse completed correctly! (${accuracy}% accuracy)`)
        playSuccessSound()
        
        // Auto-advance message
        if (state.currentVerseIndex + 1 < AL_FATIHA_VERSES.length) {
          setTimeout(() => {
            setStatusMessage('Ready for next verse. Click "Start Recitation" to continue.')
          }, 2000)
        } else {
          setTimeout(() => {
            setStatusMessage('🎉 Congratulations! You have completed Al-Fatiha!')
          }, 2000)
        }
      } else {
        setStatusMessage(`❌ Please try again. (${accuracy}% accuracy - need ${passingThreshold}%)`)
        playErrorSound()
        
        setTimeout(() => {
          setStatusMessage('Ready to retry this verse. Click "Start Recitation" when ready.')
        }, 3000)
      }
      
    } catch (error) {
      console.error('Error processing verse:', error)
      setStatusMessage('Error processing recitation. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [currentVerse, state.currentVerseIndex, speechRecognition])

  // Calculate verse accuracy
  const calculateVerseAccuracy = (spoken: string, expected: string): number => {
    const normalizedSpoken = cleanArabicText(spoken.trim())
    const normalizedExpected = cleanArabicText(expected.trim())
    
    console.log(`🔍 Comparing:`)
    console.log(`   Spoken: "${normalizedSpoken}"`)
    console.log(`   Expected: "${normalizedExpected}"`)
    
    // Direct similarity
    const directSimilarity = calculateSimilarity(normalizedSpoken, normalizedExpected)
    
    // Word-level analysis for better accuracy
    const spokenWords = normalizedSpoken.split(/\s+/).filter(word => word.length > 1)
    const expectedWords = normalizedExpected.split(/\s+/).filter(word => word.length > 1)
    
    console.log(`📝 Words comparison:`)
    console.log(`   Spoken words: [${spokenWords.join(', ')}]`)
    console.log(`   Expected words: [${expectedWords.join(', ')}]`)
    
    // Calculate word coverage
    let foundWords = 0
    expectedWords.forEach(expectedWord => {
      let bestMatch = 0
      spokenWords.forEach(spokenWord => {
        const wordSimilarity = calculateSimilarity(spokenWord, expectedWord)
        bestMatch = Math.max(bestMatch, wordSimilarity)
      })
      
      if (bestMatch >= 70) { // Word match threshold
        foundWords++
        console.log(`✅ Found word match for: "${expectedWord}" (${bestMatch}%)`)
      } else {
        console.log(`❌ No good match for: "${expectedWord}" (best: ${bestMatch}%)`)
      }
    })
    
    const wordCoverage = expectedWords.length > 0 ? (foundWords / expectedWords.length) * 100 : 0
    
    // Check if spoken text contains most of the expected verse
    const containsVerse = normalizedSpoken.includes(normalizedExpected.substring(0, Math.min(10, normalizedExpected.length)))
    
    // Final accuracy calculation
    let finalAccuracy = Math.max(directSimilarity, wordCoverage)
    
    if (containsVerse) {
      finalAccuracy = Math.max(finalAccuracy, 85)
    }
    
    // Bonus for exact matches
    if (normalizedSpoken === normalizedExpected) {
      finalAccuracy = 100
    }
    
    console.log(`📊 Final accuracy: ${Math.round(finalAccuracy)}% (direct: ${directSimilarity}%, words: ${wordCoverage}%)`)
    
    return Math.round(finalAccuracy)
  }

  // Audio feedback
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const notes = [523, 659, 784] // C, E, G chord
      
      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.1)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.4)
        
        oscillator.start(audioContext.currentTime + index * 0.1)
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.4)
      })
    } catch (error) {
      console.log('Audio feedback not available')
    }
  }

  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 300
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Audio feedback not available')
    }
  }

  // Control functions
  const startRecitation = () => {
    console.log('🎬 Starting recitation for verse', currentVerse?.id)
    console.log('🔧 Speech recognition hook available:', !!speechRecognition)
    console.log('🔧 Speech recognition supported:', speechRecognition.isSupported)
    console.log('🔧 Speech recognition error:', speechRecognition.error)
    
    // Clear any existing transcript first
    speechRecognition.clearTranscript()
    
    setState(prev => ({ 
      ...prev, 
      isReciting: true, 
      isListening: true,
      accumulatedTranscript: '',
      recordingStartTime: Date.now()
    }))
    
    console.log('📞 Calling speechRecognition.startListening()')
    speechRecognition.startListening()
    setStatusMessage('🎤 Recording... Recite the highlighted verse completely.')
    
    // Set maximum recording timeout (30 seconds)
    recordingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Recording timeout reached')
      const currentTranscript = state.accumulatedTranscript || speechRecognition.transcript
      if (currentTranscript.trim()) {
        console.log('⏰ Processing transcript from timeout:', currentTranscript)
        processVerseRecitation(currentTranscript)
      } else {
        console.log('⏰ No transcript available at timeout')
        setStatusMessage('Recording timed out. Please try again.')
        stopRecitation()
      }
    }, 30000)
  }

  const stopRecitation = () => {
    console.log('⏹️ Stopping recitation')
    setState(prev => ({ ...prev, isReciting: false, isListening: false }))
    speechRecognition.stopListening()
    clearTimeouts()
    setStatusMessage('Recitation stopped.')
  }

  const checkVerse = () => {
    console.log('🔍 Check verse triggered')
    console.log('📝 Current accumulated transcript:', `"${state.accumulatedTranscript}"`)
    console.log('🎤 Current listening state:', state.isListening)
    console.log('📱 Current app state:', state)
    
    if (state.accumulatedTranscript.trim()) {
      console.log('✅ Manual verse check triggered with transcript:', state.accumulatedTranscript)
      processVerseRecitation(state.accumulatedTranscript)
    } else {
      console.log('❌ No transcript found for verification')
      setStatusMessage('No recitation detected. Please recite the verse first.')
      
      // Also try to get any transcript from the speech recognition directly
      const directTranscript = speechRecognition.transcript
      console.log('🔍 Direct transcript from hook:', `"${directTranscript}"`)
      
      if (directTranscript.trim()) {
        console.log('🔄 Using direct transcript for processing')
        processVerseRecitation(directTranscript)
      }
    }
  }

  const playVerseAudio = (verse: typeof AL_FATIHA_VERSES[0]) => {
    speak(verse.arabic, 'ar-SA')
  }

  const retryVerse = () => {
    console.log('🔄 Retrying current verse')
    setState(prev => {
      const newStatuses = new Map(prev.verseStatuses)
      newStatuses.set(currentVerse.id, {
        verseId: currentVerse.id,
        status: 'current',
        attempts: newStatuses.get(currentVerse.id)?.attempts || 0
      })
      
      return {
        ...prev,
        verseStatuses: newStatuses,
        accumulatedTranscript: ''
      }
    })
    
    setStatusMessage('Ready to retry. Click "Start Recitation" when ready.')
  }

  const resetRecitation = () => {
    console.log('🔄 Resetting entire recitation')
    setState(prev => {
      const resetStatuses = new Map<number, VerseStatus>()
      AL_FATIHA_VERSES.forEach(verse => {
        resetStatuses.set(verse.id, {
          verseId: verse.id,
          status: verse.id === 1 ? 'current' : 'pending',
          attempts: 0
        })
      })
      
      return {
        currentVerseIndex: 0,
        isReciting: false,
        isListening: false,
        verseStatuses: resetStatuses,
        completedVerses: 0,
        accumulatedTranscript: ''
      }
    })
    
    speechRecognition.stopListening()
    speechRecognition.clearTranscript()
    clearTimeouts()
    setStatusMessage('Recitation reset. Ready to start from verse 1.')
    setIsProcessing(false)
  }

  // Get verse status styling
  const getVerseStatusStyling = (verseId: number) => {
    const status = state.verseStatuses.get(verseId)
    switch (status?.status) {
      case 'current':
        return 'bg-blue-50 border-blue-300 border-2 ring-2 ring-blue-200'
      case 'completed':
        return 'bg-green-50 border-green-300 border-2'
      case 'failed':
        return 'bg-red-50 border-red-300 border-2'
      case 'processing':
        return 'bg-yellow-50 border-yellow-300 border-2'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getVerseStatusIcon = (verseId: number) => {
    const status = state.verseStatuses.get(verseId)
    switch (status?.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'current':
        return <Mic className="h-5 w-5 text-blue-600" />
      default:
        return null
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
              Surah Al-Fatiha - Verse by Verse Practice
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Controls */}
            <div className="flex justify-center gap-4">
              {!state.isListening ? (
                <Button 
                  onClick={startRecitation} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isProcessing || state.completedVerses === totalVerses}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Recitation
                </Button>
              ) : (
                <Button 
                  onClick={stopRecitation} 
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              )}
              
              {state.isListening && (
                <Button 
                  onClick={checkVerse} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check Verse
                </Button>
              )}
              
              <Button onClick={resetRecitation} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div className="text-center">
                <p className={`text-sm ${
                  statusMessage.includes('✅') ? 'text-green-600' :
                  statusMessage.includes('❌') ? 'text-red-600' :
                  statusMessage.includes('🎉') ? 'text-green-700 font-semibold' :
                  'text-blue-600'
                }`}>
                  {statusMessage}
                </p>
              </div>
            )}

            {/* Progress */}
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">
                Progress: {state.completedVerses} / {totalVerses} verses completed
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(state.completedVerses / totalVerses) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Verse Display */}
            {currentVerse && state.completedVerses < totalVerses && (
              <div className="text-center bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-blue-700 mb-3">
                  Currently reciting verse {currentVerse.id}:
                </p>
                <div className="bg-white rounded-lg p-4 border border-blue-300">
                  <div className="text-right mb-4" dir="rtl">
                    <p className="text-3xl font-arabic leading-relaxed">
                      {currentVerse.arabic}
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600 italic">
                      {currentVerse.transliteration}
                    </p>
                    <p className="text-sm text-gray-700">
                      {currentVerse.translation}
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playVerseAudio(currentVerse)}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Listen to correct pronunciation
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Recording Status */}
            {state.isListening && (
              <div className="text-center bg-red-50 p-3 rounded border border-red-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-red-600 font-medium">Recording Active</p>
                </div>
                {speechRecognition.transcript && (
                  <p className="text-xs text-gray-500">Hook transcript: "{speechRecognition.transcript}"</p>
                )}
                {speechRecognition.interimTranscript && (
                  <p className="text-xs text-gray-500">Interim: "{speechRecognition.interimTranscript}"</p>
                )}
              </div>
            )}

            {/* Current Transcript Display */}
            {state.accumulatedTranscript && (
              <div className="text-center bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Detected speech:</p>
                <p className="text-arabic font-medium" dir="rtl">{state.accumulatedTranscript}</p>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-600">Processing your recitation...</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Verses Display */}
      <div className="space-y-4">
        {AL_FATIHA_VERSES.map((verse, index) => (
          <Card key={verse.id} className={`overflow-hidden transition-all duration-300 ${getVerseStatusStyling(verse.id)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {verse.id}
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    Verse {verse.id}
                  </CardTitle>
                  {getVerseStatusIcon(verse.id)}
                </div>
                <div className="flex items-center gap-2">
                  {state.verseStatuses.get(verse.id)?.attempts && (
                    <span className="text-xs text-gray-500">
                      Attempts: {state.verseStatuses.get(verse.id)?.attempts}
                    </span>
                  )}
                  {state.verseStatuses.get(verse.id)?.accuracy && (
                    <span className="text-xs text-gray-500">
                      Accuracy: {state.verseStatuses.get(verse.id)?.accuracy}%
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playVerseAudio(verse)}
                    className="text-green-700 hover:text-green-800"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-right mb-4" dir="rtl">
                <p className="text-2xl font-arabic leading-relaxed">
                  {verse.arabic}
                </p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-600 italic">
                  {verse.transliteration}
                </p>
                <p className="text-sm text-gray-700">
                  {verse.translation}
                </p>
              </div>
              
              {/* Retry button for failed verses */}
              {state.verseStatuses.get(verse.id)?.status === 'failed' && (
                <div className="mt-4 text-center">
                  <Button
                    onClick={retryVerse}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry This Verse
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Message */}
      {state.completedVerses === totalVerses && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl text-green-700 font-semibold mb-2">
                🎉 Excellent! You've completed Al-Fatiha!
              </p>
              <p className="text-green-600 mb-4">
                You successfully recited all {totalVerses} verses of Surah Al-Fatiha.
              </p>
              <div className="text-sm text-gray-600">
                Total accuracy: {Math.round(Array.from(state.verseStatuses.values())
                  .filter(v => v.accuracy)
                  .reduce((sum, v) => sum + (v.accuracy || 0), 0) / 
                  state.verseStatuses.size)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}