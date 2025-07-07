import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mic, MicOff, Square, Volume2, Play, Pause } from 'lucide-react'
import { useRealtimeSpeechRecognition } from '@/hooks/useRealtimeSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useAudioPlayer'
import { cleanArabicText, calculateSimilarity } from '@/lib/utils'

// Al-Fatiha verses in proper Uthmani script
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
    arabic: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
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

interface RecitationMatch {
  verseId: number
  matchedText: string
  similarity: number
  isCorrect: boolean
}

export function SimpleQuranReciter() {
  const [currentVerse, setCurrentVerse] = useState<number>(1)
  const [highlightedVerses, setHighlightedVerses] = useState<Set<number>>(new Set())
  const [incorrectVerses, setIncorrectVerses] = useState<Set<number>>(new Set())
  const [isListening, setIsListening] = useState(false)
  const [matches, setMatches] = useState<RecitationMatch[]>([])

  const { speak } = useTextToSpeech()

  // Speech recognition with real-time processing
  const speechRecognition = useRealtimeSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      handleSpeechResult(result.transcript)
    },
    onInterimResult: (interimText) => {
      // Process interim results for real-time highlighting
      if (interimText.trim()) {
        processInterimSpeech(interimText)
      }
    },
    onStart: () => setIsListening(true),
    onEnd: () => setIsListening(false),
    onError: (error) => {
      console.error('Speech recognition error:', error)
      setIsListening(false)
    }
  })

  // Process final speech recognition results
  const handleSpeechResult = useCallback((transcript: string) => {
    if (!transcript.trim()) return

    console.log('🎤 Speech Result:', transcript)
    
    const matches = findVerseMatches(transcript)
    setMatches(matches)
    
    // Update highlighting based on matches
    const newHighlighted = new Set<number>()
    const newIncorrect = new Set<number>()
    
    matches.forEach(match => {
      if (match.isCorrect) {
        newHighlighted.add(match.verseId)
      } else if (match.similarity > 30) { // Partial match but incorrect
        newIncorrect.add(match.verseId)
      }
    })
    
    setHighlightedVerses(newHighlighted)
    setIncorrectVerses(newIncorrect)
    
    // Auto-advance to next incomplete verse
    const nextIncompleteVerse = AL_FATIHA_VERSES.find(verse => 
      !newHighlighted.has(verse.id) && verse.id >= currentVerse
    )
    
    if (nextIncompleteVerse) {
      setCurrentVerse(nextIncompleteVerse.id)
    }
    
  }, [currentVerse])

  // Process interim speech for real-time feedback
  const processInterimSpeech = useCallback((interimText: string) => {
    const matches = findVerseMatches(interimText, 50) // Lower threshold for interim
    
    // Temporarily highlight potential matches
    const potentialMatches = new Set<number>()
    matches.forEach(match => {
      if (match.similarity > 50) {
        potentialMatches.add(match.verseId)
      }
    })
    
    // Could add interim highlighting here if needed
  }, [])

  // Find which verses match the spoken text
  const findVerseMatches = (spokenText: string, threshold: number = 70): RecitationMatch[] => {
    const matches: RecitationMatch[] = []
    
    AL_FATIHA_VERSES.forEach(verse => {
      const similarity = calculateArabicSimilarity(spokenText, verse.arabic)
      
      if (similarity >= threshold) {
        matches.push({
          verseId: verse.id,
          matchedText: spokenText,
          similarity,
          isCorrect: similarity >= 80
        })
      }
    })
    
    return matches.sort((a, b) => b.similarity - a.similarity)
  }

  // Calculate similarity between spoken text and verse
  const calculateArabicSimilarity = (spoken: string, expected: string): number => {
    const normalizedSpoken = cleanArabicText(spoken)
    const normalizedExpected = cleanArabicText(expected)
    
    // Check for partial matches within the verse
    const words = normalizedSpoken.split(/\s+/)
    let maxSimilarity = 0
    
    words.forEach(word => {
      if (word.length > 2) {
        if (normalizedExpected.includes(word)) {
          maxSimilarity = Math.max(maxSimilarity, 90)
        } else {
          const similarity = calculateSimilarity(word, normalizedExpected)
          maxSimilarity = Math.max(maxSimilarity, similarity)
        }
      }
    })
    
    // Also check overall similarity
    const overallSimilarity = calculateSimilarity(normalizedSpoken, normalizedExpected)
    
    return Math.max(maxSimilarity, overallSimilarity)
  }

  const handleStartListening = () => {
    speechRecognition.startListening()
  }

  const handleStopListening = () => {
    speechRecognition.stopListening()
  }

  const handlePlayVerse = (verseId: number) => {
    const verse = AL_FATIHA_VERSES.find(v => v.id === verseId)
    if (verse) {
      speak(verse.arabic, 'ar-SA')
    }
  }

  const resetRecitation = () => {
    setHighlightedVerses(new Set())
    setIncorrectVerses(new Set())
    setMatches([])
    setCurrentVerse(1)
  }

  const getVerseStatusColor = (verseId: number) => {
    if (highlightedVerses.has(verseId)) {
      return 'bg-green-100 border-green-300 text-green-900'
    }
    if (incorrectVerses.has(verseId)) {
      return 'bg-red-100 border-red-300 text-red-900'
    }
    if (verseId === currentVerse) {
      return 'bg-blue-50 border-blue-300 text-blue-900'
    }
    return 'bg-white border-gray-200'
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-800">
            سُورَةُ الْفَاتِحَة
            <span className="block text-lg font-normal text-gray-600 mt-2">
              Surah Al-Fatiha - The Opening
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center space-x-4 mb-4">
            <Button
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`px-8 py-3 ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={!speechRecognition.isSupported}
            >
              {isListening ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start Recitation
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={resetRecitation}
            >
              Reset
            </Button>
          </div>

          {!speechRecognition.isSupported && (
            <div className="text-center text-red-600 mb-4">
              <MicOff className="h-8 w-8 mx-auto mb-2" />
              <p>Speech recognition not supported. Please use Chrome, Edge, or Safari.</p>
            </div>
          )}

          {isListening && (
            <div className="text-center text-green-600 mb-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Mic className="h-8 w-8 mx-auto mb-2" />
              </motion.div>
              <p>Listening... Start reciting Al-Fatiha</p>
            </div>
          )}

          {/* Progress */}
          <div className="text-center text-sm text-gray-600">
            Completed: {highlightedVerses.size} / {AL_FATIHA_VERSES.length} verses
          </div>
        </CardContent>
      </Card>

      {/* Quran Text */}
      <div className="space-y-4">
        {AL_FATIHA_VERSES.map((verse) => (
          <motion.div
            key={verse.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: verse.id * 0.1 }}
          >
            <Card className={`transition-all duration-300 ${getVerseStatusColor(verse.id)}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {verse.id}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayVerse(verse.id)}
                      className="text-green-700 hover:text-green-800"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {highlightedVerses.has(verse.id) && (
                    <div className="text-green-600 text-sm font-medium">
                      ✓ Correct
                    </div>
                  )}
                  
                  {incorrectVerses.has(verse.id) && (
                    <div className="text-red-600 text-sm font-medium">
                      ✗ Needs Practice
                    </div>
                  )}
                </div>

                {/* Arabic Text - Uthmani Script */}
                <div className="text-right mb-4" dir="rtl">
                  <p className="text-3xl leading-loose font-arabic uthmani-font" style={{
                    fontFamily: 'Amiri Quran, KFGQPC Uthman Taha Naskh, Times New Roman, serif',
                    lineHeight: '2.5'
                  }}>
                    {verse.arabic}
                  </p>
                </div>

                {/* Transliteration */}
                <div className="mb-3">
                  <p className="text-lg text-gray-700 italic text-center">
                    {verse.transliteration}
                  </p>
                </div>

                {/* Translation */}
                <div>
                  <p className="text-gray-800 text-center">
                    {verse.translation}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Real-time Feedback */}
      {speechRecognition.transcript && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">Live Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-right mb-3" dir="rtl">
              <p className="text-xl text-blue-900 uthmani-font">
                {speechRecognition.transcript}
              </p>
            </div>
            
            {speechRecognition.interimTranscript && (
              <div className="text-right mb-3" dir="rtl">
                <p className="text-lg text-blue-600 italic uthmani-font">
                  {speechRecognition.interimTranscript}
                </p>
              </div>
            )}

            {matches.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-blue-800">Recognition Results:</p>
                {matches.slice(0, 3).map((match, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>Verse {match.verseId}</span>
                    <span className={`font-medium ${match.isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
                      {match.similarity.toFixed(0)}% match
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}