import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Settings, BookOpen, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { AudioRecorder } from '@/components/audio/AudioRecorder'
import { QuranDisplay } from '@/components/quran/QuranDisplay'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useAppActions, useCurrentSession, useIsProcessing } from '@/stores/appStore'
import { QuranVerse } from '@/types'

// Mock data - in real app this would come from API
const mockVerses: QuranVerse[] = [
  {
    id: 'fatiha-1',
    surahNumber: 1,
    verseNumber: 1,
    arabicText: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    transliteration: 'Bismillāhi r-raḥmāni r-raḥīm',
    translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    audioUrl: '/audio/fatiha-1.mp3'
  },
  {
    id: 'fatiha-2',
    surahNumber: 1,
    verseNumber: 2,
    arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: 'Al-ḥamdu lillāhi rabbi l-ʿālamīn',
    translation: 'All praise is due to Allah, Lord of the worlds.',
    audioUrl: '/audio/fatiha-2.mp3'
  },
  {
    id: 'fatiha-3',
    surahNumber: 1,
    verseNumber: 3,
    arabicText: 'الرَّحْمَنِ الرَّحِيمِ',
    transliteration: 'Ar-raḥmāni r-raḥīm',
    translation: 'The Entirely Merciful, the Especially Merciful,',
    audioUrl: '/audio/fatiha-3.mp3'
  }
]

export default function RecitationPage() {
  const navigate = useNavigate()
  const { addToast, setCurrentVerse, createSession, updateSession } = useAppActions()
  const currentSession = useCurrentSession()
  const isProcessing = useIsProcessing()
  
  const [currentVerseId, setCurrentVerseId] = useState<string>('fatiha-1')
  const [highlightedWords, setHighlightedWords] = useState<string[]>([])
  const [currentWordId, setCurrentWordId] = useState<string>()
  const [incorrectWords, setIncorrectWords] = useState<string[]>([])
  const [sessionProgress, setSessionProgress] = useState(0)

  const { processAudio, isProcessing: isSpeechProcessing, result: speechResult } = useSpeechToText({
    provider: 'browser', // Use browser for demo, can switch to OpenAI/Google
    language: 'ar-SA',
    onResult: (result) => {
      console.log('Speech result:', result)
      handleSpeechResult(result.transcript)
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Speech Recognition Error',
        description: error
      })
    }
  })

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    try {
      addToast({
        type: 'info',
        title: 'Processing Recording',
        description: 'Analyzing your recitation...'
      })

      // Process the audio with speech-to-text
      await processAudio(audioBlob)
      
    } catch (error) {
      console.error('Processing failed:', error)
      addToast({
        type: 'error',
        title: 'Processing Failed',
        description: 'Unable to process your recording. Please try again.'
      })
    }
  }, [processAudio, addToast])

  const handleSpeechResult = useCallback((transcript: string) => {
    const currentVerse = mockVerses.find(v => v.id === currentVerseId)
    if (!currentVerse) return

    // Simple comparison - in real app this would be more sophisticated
    const cleanTranscript = transcript.trim().toLowerCase()
    const cleanExpected = currentVerse.arabicText.toLowerCase()
    
    // Mock word highlighting logic
    const words = currentVerse.arabicText.split(' ')
    const transcriptWords = transcript.split(' ')
    
    const correct: string[] = []
    const incorrect: string[] = []
    
    words.forEach((word, index) => {
      const wordId = `${currentVerseId}-word-${index}`
      if (index < transcriptWords.length) {
        // Very basic comparison - in real app would use sophisticated matching
        if (transcriptWords[index]?.includes(word.substring(0, 2))) {
          correct.push(wordId)
        } else {
          incorrect.push(wordId)
        }
      }
    })
    
    setHighlightedWords(correct)
    setIncorrectWords(incorrect)
    
    // Calculate accuracy
    const accuracy = (correct.length / words.length) * 100
    
    // Update session
    if (currentSession) {
      updateSession({
        transcription: transcript,
        accuracy: Math.round(accuracy),
        status: 'completed'
      })
    }
    
    // Show feedback
    if (accuracy >= 80) {
      addToast({
        type: 'success',
        title: 'Excellent Recitation!',
        description: `${Math.round(accuracy)}% accuracy. Well done!`
      })
      
      // Auto-advance to next verse after delay
      setTimeout(() => {
        handleNextVerse()
      }, 2000)
    } else {
      addToast({
        type: 'warning',
        title: 'Good Effort!',
        description: `${Math.round(accuracy)}% accuracy. Practice makes perfect!`
      })
    }
    
    setSessionProgress(prev => Math.min(prev + (100 / mockVerses.length), 100))
  }, [currentVerseId, currentSession, updateSession, addToast])

  const handleVerseSelect = (verseId: string) => {
    setCurrentVerseId(verseId)
    setCurrentVerse(mockVerses.find(v => v.id === verseId)!)
    setHighlightedWords([])
    setIncorrectWords([])
    setCurrentWordId(undefined)
    
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

  const handlePlayAudio = (verseId: string) => {
    // Mock audio playback
    addToast({
      type: 'info',
      title: 'Playing Reference Audio',
      description: 'Listen carefully to the correct pronunciation.'
    })
  }

  const currentVerse = mockVerses.find(v => v.id === currentVerseId)
  const currentIndex = mockVerses.findIndex(v => v.id === currentVerseId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-cream via-white to-islamic-cream/50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-islamic-green/10 sticky top-0 z-50">
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
                <BookOpen className="h-5 w-5 text-islamic-green" />
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

            {/* Quran Display */}
            <QuranDisplay
              verses={mockVerses}
              currentVerseId={currentVerseId}
              highlightedWords={highlightedWords}
              currentWordId={currentWordId}
              incorrectWords={incorrectWords}
              onVerseSelect={handleVerseSelect}
              onPlayAudio={handlePlayAudio}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recording Card */}
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              maxDuration={120} // 2 minutes
              disabled={!currentVerse}
            />

            {/* Feedback Card */}
            {(isProcessing || isSpeechProcessing) && (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-3 text-sm text-gray-600">
                      {isSpeechProcessing ? 'Processing your recitation...' : 'Analyzing pronunciation...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Card */}
            {speechResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">What you said:</p>
                      <p className="text-right rtl arabic-text bg-gray-50 p-3 rounded">
                        {speechResult.transcript}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Confidence:</p>
                      <Progress 
                        value={speechResult.confidence} 
                        max={100} 
                        variant={speechResult.confidence >= 80 ? 'success' : 'warning'}
                        showLabel 
                      />
                    </div>

                    {currentSession?.accuracy && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Accuracy:</p>
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
                  <div className="w-6 h-6 bg-islamic-green text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <p>Select a verse from the Quran display</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-islamic-green text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <p>Listen to the reference audio if available</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-islamic-green text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <p>Click "Start Recording" and recite clearly</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-islamic-green text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <p>Review feedback and practice again if needed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}