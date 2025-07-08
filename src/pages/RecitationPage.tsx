import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Settings, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { RealtimeRecorder } from '@/components/audio/RealtimeRecorder'
import { ContinuousQuranDisplay } from '@/components/quran/ContinuousQuranDisplay'
import { useRealtimeSpeechRecognition } from '@/hooks/useRealtimeSpeechRecognition'
import { useAudioPlayer, useTextToSpeech } from '@/hooks/useAudioPlayer'
import { useAppActions, useCurrentSession } from '@/stores/appStore'
import { QuranVerse, QuranWord } from '@/types'
import { matchSpokenWords, matchRealTimeWords, generatePronunciationFeedback } from '@/lib/quran/wordMatching'

// Corrected mock data with proper word-by-word breakdown
const mockVerses: QuranVerse[] = [
  {
    id: 'fatiha-1',
    surahNumber: 1,
    verseNumber: 1,
    arabicText: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    transliteration: 'Bismillāhi r-raḥmāni r-raḥīm',
    translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    audioUrl: '/audio/fatiha-1.mp3',
    words: [
      { arabic: 'بِسْمِ', transliteration: 'Bismi', translation: 'In the name' },
      { arabic: 'اللَّهِ', transliteration: 'llāhi', translation: 'of Allah' },
      { arabic: 'الرَّحْمَنِ', transliteration: 'r-raḥmāni', translation: 'the Entirely Merciful' },
      { arabic: 'الرَّحِيمِ', transliteration: 'r-raḥīm', translation: 'the Especially Merciful' }
    ]
  },
  {
    id: 'fatiha-2',
    surahNumber: 1,
    verseNumber: 2,
    arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: 'Al-ḥamdu lillāhi rabbi l-ʿālamīn',
    translation: 'All praise is due to Allah, Lord of the worlds.',
    audioUrl: '/audio/fatiha-2.mp3',
    words: [
      { arabic: 'الْحَمْدُ', transliteration: 'Al-ḥamdu', translation: 'All praise' },
      { arabic: 'لِلَّهِ', transliteration: 'lillāhi', translation: 'is due to Allah' },
      { arabic: 'رَبِّ', transliteration: 'rabbi', translation: 'Lord' },
      { arabic: 'الْعَالَمِينَ', transliteration: 'l-ʿālamīn', translation: 'of the worlds' }
    ]
  },
  {
    id: 'fatiha-3',
    surahNumber: 1,
    verseNumber: 3,
    arabicText: 'الرَّحْمَنِ الرَّحِيمِ',
    transliteration: 'Ar-raḥmāni r-raḥīm',
    translation: 'The Entirely Merciful, the Especially Merciful,',
    audioUrl: '/audio/fatiha-3.mp3',
    words: [
      { arabic: 'الرَّحْمَنِ', transliteration: 'Ar-raḥmāni', translation: 'The Entirely Merciful' },
      { arabic: 'الرَّحِيمِ', transliteration: 'r-raḥīm', translation: 'the Especially Merciful' }
    ]
  },
  {
    id: 'fatiha-4',
    surahNumber: 1,
    verseNumber: 4,
    arabicText: 'مَالِكِ يَوْمِ الدِّينِ',
    transliteration: 'Māliki yawmi d-dīn',
    translation: 'Sovereign of the Day of Recompense.',
    audioUrl: '/audio/fatiha-4.mp3',
    words: [
      { arabic: 'مَالِكِ', transliteration: 'maliki', translation: 'Sovereign' },
      { arabic: 'يَوْمِ', transliteration: 'yawmi', translation: 'Day' },
      { arabic: 'الدِّينِ', transliteration: 'ad-deen', translation: 'of Recompense' }
    ]
  },
  {
    id: 'fatiha-5',
    surahNumber: 1,
    verseNumber: 5,
    arabicText: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    transliteration: 'Iyyāka naʿbudu wa-iyyāka nastaʿīn',
    translation: 'It is You we worship and You we ask for help.',
    audioUrl: '/audio/fatiha-5.mp3',
    words: [
      { arabic: 'إِيَّاكَ', transliteration: 'iyyāka', translation: 'You' },
      { arabic: 'نَعْبُدُ', transliteration: 'naʿbudu', translation: 'we worship' },
      { arabic: 'وَإِيَّاكَ', transliteration: 'wa-iyyāka', translation: 'and You' },
      { arabic: 'نَسْتَعِينُ', transliteration: 'nastaʿīn', translation: 'we ask for help' }
    ]
  },
  {
    id: 'fatiha-6',
    surahNumber: 1,
    verseNumber: 6,
    arabicText: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
    transliteration: 'Ihdinā ṣ-ṣirāṭa l-mustaqīm',
    translation: 'Guide us to the straight path.',
    audioUrl: '/audio/fatiha-6.mp3',
    words: [
      { arabic: 'اهْدِنَا', transliteration: 'ihdinā', translation: 'Guide us' },
      { arabic: 'الصِّرَاطَ', transliteration: 'aṣ-ṣirāṭa', translation: 'the path' },
      { arabic: 'الْمُسْتَقِيمَ', transliteration: 'al-mustaqīm', translation: 'the straight' }
    ]
  },
  {
    id: 'fatiha-7',
    surahNumber: 1,
    verseNumber: 7,
    arabicText: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    transliteration: 'Ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa-lā ḍ-ḍāllīn',
    translation: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
    audioUrl: '/audio/fatiha-7.mp3',
    words: [
      { arabic: 'صِرَاطَ', transliteration: 'ṣirāṭa', translation: 'The path' },
      { arabic: 'الَّذِينَ', transliteration: 'alladhīna', translation: 'of those' },
      { arabic: 'أَنْعَمْتَ', transliteration: 'anʿamta', translation: 'You have bestowed favor' },
      { arabic: 'عَلَيْهِمْ', transliteration: 'ʿalayhim', translation: 'upon them' },
      { arabic: 'غَيْرِ', transliteration: 'ghayri', translation: 'not' },
      { arabic: 'الْمَغْضُوبِ', transliteration: 'al-maghḍūbi', translation: 'those who have evoked anger' },
      { arabic: 'عَلَيْهِمْ', transliteration: 'ʿalayhim', translation: 'upon them' },
      { arabic: 'وَلَا', transliteration: 'wa-lā', translation: 'and not' },
      { arabic: 'الضَّالِّينَ', transliteration: 'aḍ-ḍāllīn', translation: 'those who are astray' }
    ]
  }
]

// Create word-level data from verses using proper word boundaries
const createWordsFromVerse = (verse: QuranVerse): QuranWord[] => {
  // Use the predefined word data if available, otherwise fall back to splitting
  if (verse.words && verse.words.length > 0) {
    return verse.words.map((wordData, index) => ({
      id: `${verse.id}-word-${index}`,
      verseId: verse.id,
      position: index,
      arabicText: wordData.arabic,
      transliteration: wordData.transliteration,
      translation: wordData.translation,
      audioTimestamp: {
        start: index * 0.8,
        end: (index + 1) * 0.8
      }
    }))
  }
  
  // Fallback to simple splitting if no word data is provided
  const words = verse.arabicText.split(/\s+/)
  const transliterationWords = verse.transliteration.split(/\s+/)
  
  return words.map((word, index) => ({
    id: `${verse.id}-word-${index}`,
    verseId: verse.id,
    position: index,
    arabicText: word,
    transliteration: transliterationWords[index] || `word-${index}`,
    translation: `word ${index + 1}`,
    audioTimestamp: {
      start: index * 0.8,
      end: (index + 1) * 0.8
    }
  }))
}

// Removed - not needed

export default function RecitationPage() {
  const navigate = useNavigate()
  const { addToast, setCurrentVerse, createSession, updateSession } = useAppActions()
  const currentSession = useCurrentSession()
  // const isProcessing = useIsProcessing()
  
  const [currentVerseId, setCurrentVerseId] = useState<string>('fatiha-1')
  const [highlightedWords, setHighlightedWords] = useState<string[]>([])
  const [currentWordId, setCurrentWordId] = useState<string>()
  const [incorrectWords, setIncorrectWords] = useState<string[]>([])
  const [sessionProgress, setSessionProgress] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isListeningActive, setIsListeningActive] = useState(false)

  // Audio player for reference pronunciation
  const audioPlayer = useAudioPlayer({
    onPlay: () => {
      addToast({
        type: 'info',
        title: 'Playing Reference Audio',
        description: 'Listen carefully to the correct pronunciation.'
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Audio Playback Failed',
        description: 'Using text-to-speech as fallback.'
      })
    }
  })

  // Text-to-speech fallback
  const { speak: speakText } = useTextToSpeech()

  // Real-time speech recognition
  const speechRecognition = useRealtimeSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      handleSpeechResult(result.transcript, false)
    },
    onInterimResult: (interimText) => {
      handleRealtimeResult(interimText)
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Speech Recognition Error',
        description: error
      })
      setIsListeningActive(false)
    },
    onStart: () => {
      addToast({
        type: 'success',
        title: 'Listening Started',
        description: 'Start reciting the verse clearly.'
      })
      setIsListeningActive(true)
    },
    onEnd: () => {
      setIsListeningActive(false)
    }
  })

  // Handle real-time interim results for live word highlighting
  const handleRealtimeResult = useCallback((interimText: string) => {
    if (!interimText.trim()) return

    const currentVerse = mockVerses.find(v => v.id === currentVerseId)
    if (!currentVerse) return

    const currentWords = createWordsFromVerse(currentVerse)
    const realtimeResult = matchRealTimeWords(
      interimText, 
      speechRecognition.transcript, 
      currentWords, 
      currentWordIndex
    )

    if (realtimeResult.currentWordId) {
      setCurrentWordId(realtimeResult.currentWordId)
    }
  }, [currentVerseId, currentWordIndex, speechRecognition.transcript])

  // Handle final speech recognition results
  const handleSpeechResult = useCallback((transcript: string, isFinal: boolean = true) => {
    if (!transcript.trim()) return

    const currentVerse = mockVerses.find(v => v.id === currentVerseId)
    if (!currentVerse) return

    const currentWords = createWordsFromVerse(currentVerse)
    const matchingResult = matchSpokenWords(transcript, currentWords, currentWordIndex, 70)
    
    // Update highlighting
    setHighlightedWords(matchingResult.highlightedWords)
    setIncorrectWords(matchingResult.incorrectWords)
    setCurrentWordIndex(matchingResult.currentWordIndex)
    
    if (matchingResult.nextExpectedWord) {
      setCurrentWordId(matchingResult.nextExpectedWord.id)
    }

    // Generate feedback
    const feedback = generatePronunciationFeedback(matchingResult.matches)
    
    // Update session
    if (currentSession && isFinal) {
      updateSession({
        transcription: transcript,
        accuracy: feedback.overallScore,
        status: feedback.overallScore >= 70 ? 'completed' : 'processing'
      })
    }
    
    // Check if verse is completed (regardless of accuracy for auto-advance)
    const isVerseCompleted = matchingResult.currentWordIndex >= currentWords.length * 0.9 ||
                            matchingResult.highlightedWords.length >= currentWords.length * 0.8
    
    // Show feedback for final results
    if (isFinal) {
      if (feedback.overallScore >= 90) {
        addToast({
          type: 'success',
          title: 'Excellent Recitation!',
          description: `${feedback.overallScore}% accuracy. ${feedback.feedback[0]}`
        })
      } else if (feedback.overallScore >= 70) {
        addToast({
          type: 'warning',
          title: 'Good Effort!',
          description: `${feedback.overallScore}% accuracy. ${feedback.feedback[0]}`
        })
      } else {
        addToast({
          type: 'error',
          title: 'Keep Practicing!',
          description: `${feedback.overallScore}% accuracy. ${feedback.suggestions[0]}`
        })
      }
      
      // Auto-advance if verse is completed (even if accuracy is low)
      if (isVerseCompleted) {
        addToast({
          type: 'info',
          title: 'Verse Completed',
          description: 'Moving to next verse automatically...'
        })
        
        setTimeout(() => {
          handleNextVerse()
        }, 2000)
      }
    }
    
    // Update progress
    const verseProgress = (matchingResult.currentWordIndex / currentWords.length) * 100
    const overallProgress = (mockVerses.findIndex(v => v.id === currentVerseId) * 100 + verseProgress) / mockVerses.length
    setSessionProgress(Math.min(overallProgress, 100))
  }, [currentVerseId, currentWordIndex, currentSession, updateSession, addToast])

  // Start/stop recording with real-time recognition
  const handleStartRecording = useCallback(() => {
    if (speechRecognition.isSupported) {
      speechRecognition.startListening()
    } else {
      addToast({
        type: 'error',
        title: 'Speech Recognition Not Supported',
        description: 'Please use a compatible browser like Chrome or Edge.'
      })
    }
  }, [speechRecognition, addToast])

  const handleStopRecording = useCallback(() => {
    speechRecognition.stopListening()
  }, [speechRecognition])

  // Removed - not needed with real-time recognition

  const handleVerseSelect = (verseId: string) => {
    console.log('🔄 Verse Selection:', { 
      newVerseId: verseId, 
      previousVerseId: currentVerseId,
      resettingWordIndex: true 
    })
    
    setCurrentVerseId(verseId)
    setCurrentVerse(mockVerses.find(v => v.id === verseId)!)
    setHighlightedWords([])
    setIncorrectWords([])
    setCurrentWordId(undefined)
    setCurrentWordIndex(0) // ✅ Reset word index to start from beginning
    
    // Set the first word as current for the new verse
    const newVerse = mockVerses.find(v => v.id === verseId)
    if (newVerse) {
      const newVerseWords = createWordsFromVerse(newVerse)
      if (newVerseWords.length > 0) {
        setCurrentWordId(newVerseWords[0].id)
        console.log('✅ New verse setup complete:', {
          verseId: newVerse.id,
          firstWordId: newVerseWords[0].id,
          firstWordArabic: newVerseWords[0].arabicText,
          firstWordTransliteration: newVerseWords[0].transliteration
        })
      }
    }
    
    // Create new session
    createSession(verseId)
  }

  const handleNextVerse = () => {
    const currentIndex = mockVerses.findIndex(v => v.id === currentVerseId)
    if (currentIndex < mockVerses.length - 1) {
      const nextVerse = mockVerses[currentIndex + 1]
      handleVerseSelect(nextVerse.id)
    } else {
      addToast({
        type: 'success',
        title: 'Session Complete!',
        description: 'You have completed all verses in this session.'
      })
    }
  }

  const handlePlayAudio = useCallback(async (verseId: string) => {
    const verse = mockVerses.find(v => v.id === verseId)
    if (!verse) return

    try {
      // Try to play audio file first
      if (verse.audioUrl) {
        await audioPlayer.play(verse.audioUrl)
      } else {
        // Fallback to text-to-speech
        await speakText(verse.arabicText, 'ar-SA')
        addToast({
          type: 'info',
          title: 'Playing Text-to-Speech',
          description: 'Audio file not available, using text-to-speech.'
        })
      }
    } catch (error) {
      // If audio fails, use text-to-speech as fallback
      try {
        await speakText(verse.arabicText, 'ar-SA')
        addToast({
          type: 'warning',
          title: 'Using Text-to-Speech',
          description: 'Audio file not available, using browser speech synthesis.'
        })
      } catch (ttsError) {
        addToast({
          type: 'error',
          title: 'Audio Playback Failed',
          description: 'Unable to play reference audio. Please check your browser settings.'
        })
      }
    }
  }, [audioPlayer, speakText, addToast])

  const currentVerse = mockVerses.find(v => v.id === currentVerseId)
  const currentIndex = mockVerses.findIndex(v => v.id === currentVerseId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-green-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-green-700" />
                <span className="font-medium text-gray-900">Recitation Practice</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <Progress value={sessionProgress} max={100} className="w-32" showLabel />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Session Progress</span>
                  <span className="text-sm font-normal text-gray-600">
                    Verse {currentIndex + 1} of {mockVerses.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={sessionProgress} 
                  max={100} 
                  variant="success"
                  showLabel 
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Current: Surah Al-Fatiha</span>
                  <span>{Math.round(sessionProgress)}% Complete</span>
                </div>
              </CardContent>
            </Card>

            {/* Continuous Quran Display */}
            <ContinuousQuranDisplay
              verses={mockVerses}
              currentVerseId={currentVerseId}
              highlightedWords={highlightedWords}
              currentWordId={currentWordId}
              incorrectWords={incorrectWords}
              onPlayAudio={handlePlayAudio}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Real-time Recognition Card */}
            <RealtimeRecorder
              isListening={speechRecognition.isListening}
              isSupported={speechRecognition.isSupported}
              transcript={speechRecognition.transcript}
              interimTranscript={speechRecognition.interimTranscript}
              confidence={speechRecognition.confidence}
              error={speechRecognition.error}
              onStartListening={handleStartRecording}
              onStopListening={handleStopRecording}
              disabled={!currentVerse}
            />

            {/* Feedback Card */}
            {isListeningActive && speechRecognition.transcript && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Real-time Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Recognition in progress:</p>
                      <div className="bg-gray-50 p-3 rounded border">
                        <p className="text-right rtl arabic-text text-lg leading-relaxed">
                          {speechRecognition.transcript}
                        </p>
                        {speechRecognition.interimTranscript && (
                          <p className="text-right rtl arabic-text text-lg leading-relaxed text-blue-600 italic mt-2">
                            {speechRecognition.interimTranscript}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Recognition Confidence:</p>
                      <Progress 
                        value={speechRecognition.confidence} 
                        max={100} 
                        variant={speechRecognition.confidence >= 80 ? 'success' : 'warning'}
                        showLabel 
                      />
                    </div>

                    {currentSession?.accuracy && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Current Accuracy:</p>
                        <Progress 
                          value={currentSession.accuracy} 
                          max={100} 
                          variant={currentSession.accuracy >= 80 ? 'success' : 'warning'}
                          showLabel 
                        />
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerseSelect(currentVerseId)}
                        className="flex-1"
                      >
                        Try Again
                      </Button>
                      {currentIndex < mockVerses.length - 1 && (
                        <Button
                          size="sm"
                          onClick={handleNextVerse}
                          className="flex-1"
                        >
                          Next Verse
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Practice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <p>Select a verse from the Quran display</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <p>Listen to the reference audio if available</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <p>Click "Start Recording" and recite clearly</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <p>Review feedback and practice again if needed</p>
                </div>
                
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Having microphone issues?</strong>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/diagnostics')}
                    className="w-full"
                  >
                    Run Microphone Diagnostics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}