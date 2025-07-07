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

  // Speech recognition with chunked processing
  const speechRecognition = useRealtimeSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      const fullTranscript = result.transcript.trim()
      console.log('🎤 Full transcript received:', fullTranscript)
      handleSpeechResult(fullTranscript)
    },
    onInterimResult: (interimText) => {
      // Process interim results for real-time highlighting
      if (interimText.trim()) {
        processInterimSpeech(interimText)
      }
    },
    onStart: () => {
      setIsListening(true)
    },
    onEnd: () => setIsListening(false),
    onError: (error) => {
      console.error('Speech recognition error:', error)
      setIsListening(false)
    }
  })

  // Advance to next verse and clear speech recognition
  const advanceToNextVerse = useCallback((nextVerseId: number) => {
    console.log(`🔄 Advancing from verse ${currentVerse} to verse ${nextVerseId}`)
    setCurrentVerse(nextVerseId)
    
    // Stop and restart speech recognition to clear the transcript
    if (speechRecognition.isListening) {
      speechRecognition.stopListening()
      setTimeout(() => {
        speechRecognition.clearTranscript()
        speechRecognition.startListening()
        console.log('🧹 Restarted speech recognition for new verse')
      }, 100)
    } else {
      speechRecognition.clearTranscript()
    }
    
    console.log('🧹 Advanced to new verse (preserved highlights)')
  }, [currentVerse, speechRecognition])

  // Process final speech recognition results
  const handleSpeechResult = useCallback((transcript: string) => {
    if (!transcript.trim()) return

    console.log('🎤 Full Speech Result:', transcript)
    console.log('🎯 Current Expected Verse:', currentVerse)
    
    // NEW LOGIC: Focus on current verse first, then check for progression
    const currentVerseData = AL_FATIHA_VERSES.find(v => v.id === currentVerse)
    if (!currentVerseData) return

    // Check if current verse is being recited correctly
    const currentVerseSimilarity = calculateArabicSimilarity(transcript, currentVerseData.arabic)
    console.log(`🔍 Current verse ${currentVerse} similarity: ${currentVerseSimilarity}%`)

    // PRESERVE previous highlights - don't reset them
    const newHighlighted = new Set(highlightedVerses)
    const newIncorrect = new Set(incorrectVerses)
    let allMatches: RecitationMatch[] = [...matches] // Keep previous matches too

    // Primary check: Is user reading the current expected verse?
    if (currentVerseSimilarity >= 75) {
      newHighlighted.add(currentVerse)
      newIncorrect.delete(currentVerse)
      console.log(`✅ Current verse ${currentVerse} marked as correct (${currentVerseSimilarity}%)`)
      
      allMatches.push({
        verseId: currentVerse,
        matchedText: transcript,
        similarity: currentVerseSimilarity,
        isCorrect: true
      })

      // Advance to next verse and clear transcript
      const nextVerse = AL_FATIHA_VERSES.find(v => v.id === currentVerse + 1)
      if (nextVerse) {
        advanceToNextVerse(nextVerse.id)
      }
    } else {
      // Secondary check: Are they reading ahead or catching up?
      const verseSegments = extractVerseSegments(transcript)
      console.log('📝 Extracted Verse Segments:', verseSegments)
      
      let foundValidMatch = false
      
      verseSegments.forEach(segment => {
        // Only check verses around the current verse (±2 range)
        const verseRange = AL_FATIHA_VERSES.filter(v => 
          v.id >= Math.max(1, currentVerse - 2) && 
          v.id <= Math.min(AL_FATIHA_VERSES.length, currentVerse + 3)
        )
        
        verseRange.forEach(verse => {
          const similarity = calculateArabicSimilarity(segment.text, verse.arabic)
          
          if (similarity >= 75) {
            newHighlighted.add(verse.id)
            newIncorrect.delete(verse.id)
            foundValidMatch = true
            console.log(`✅ Verse ${verse.id} marked as correct (${similarity}%)`)
            
            allMatches.push({
              verseId: verse.id,
              matchedText: segment.text,
              similarity,
              isCorrect: true
            })

            // Update current verse to the highest correctly read verse
            if (verse.id >= currentVerse) {
              const nextVerseId = Math.min(verse.id + 1, AL_FATIHA_VERSES.length)
              advanceToNextVerse(nextVerseId)
            }
          }
        })
      })

      // If no valid matches found for current verse, only mark as incorrect if similarity is very low
      if (!foundValidMatch && currentVerseSimilarity < 40) {
        console.log(`❌ Current verse ${currentVerse} marked as incorrect (${currentVerseSimilarity}%)`)
        // Don't automatically mark as incorrect - let user try again
      }
    }
    
    setHighlightedVerses(newHighlighted)
    setIncorrectVerses(newIncorrect)
    setMatches(allMatches)
    
  }, [currentVerse, highlightedVerses, incorrectVerses])

  // Extract individual verse segments from continuous speech
  const extractVerseSegments = (transcript: string): { text: string; startIndex: number }[] => {
    const segments: { text: string; startIndex: number }[] = []
    const normalizedTranscript = cleanArabicText(transcript.trim())
    
    // Known verse patterns and key phrases for segmentation
    const verseMarkers = [
      'بسم الله', 'الحمد لله', 'الرحمن الرحيم', 'مالك يوم الدين', 
      'اياك نعبد', 'اهدنا الصراط', 'صراط الذين'
    ]
    
    // First, try to match complete verses
    AL_FATIHA_VERSES.forEach(verse => {
      const normalizedVerse = cleanArabicText(verse.arabic)
      const verseWords = normalizedVerse.split(/\s+/)
      
      // Check if this verse appears in the transcript
      for (let i = 0; i <= normalizedTranscript.length - normalizedVerse.length; i++) {
        const segment = normalizedTranscript.substring(i, i + normalizedVerse.length)
        const similarity = calculateSimilarity(segment, normalizedVerse)
        
        if (similarity >= 70) {
          segments.push({
            text: segment,
            startIndex: i
          })
        }
      }
      
      // Also check for partial matches (first few words of verse)
      const firstHalf = verseWords.slice(0, Math.ceil(verseWords.length / 2)).join(' ')
      const secondHalf = verseWords.slice(Math.ceil(verseWords.length / 2)).join(' ')
      
      if (normalizedTranscript.includes(firstHalf)) {
        segments.push({
          text: firstHalf,
          startIndex: normalizedTranscript.indexOf(firstHalf)
        })
      }
      
      if (normalizedTranscript.includes(secondHalf)) {
        segments.push({
          text: secondHalf,
          startIndex: normalizedTranscript.indexOf(secondHalf)
        })
      }
    })
    
    // If no specific matches, split by common Arabic sentence patterns
    if (segments.length === 0) {
      const words = normalizedTranscript.split(/\s+/)
      const segmentSize = Math.ceil(words.length / 3) // Split into roughly 3 segments
      
      for (let i = 0; i < words.length; i += segmentSize) {
        const segmentWords = words.slice(i, i + segmentSize)
        if (segmentWords.length > 0) {
          segments.push({
            text: segmentWords.join(' '),
            startIndex: i
          })
        }
      }
    }
    
    // Remove duplicates and sort by position
    const uniqueSegments = segments
      .filter((segment, index, self) => 
        self.findIndex(s => s.text === segment.text) === index
      )
      .sort((a, b) => a.startIndex - b.startIndex)
    
    return uniqueSegments.length > 0 ? uniqueSegments : [{ text: normalizedTranscript, startIndex: 0 }]
  }

  // Process interim speech for real-time feedback
  const processInterimSpeech = useCallback((interimText: string) => {
    const segments = extractVerseSegments(interimText)
    
    // Process each segment for potential matches
    segments.forEach(segment => {
      const matches = findVerseMatches(segment.text, 50) // Lower threshold for interim
      
      // Could add interim highlighting here if needed
      matches.forEach(match => {
        if (match.similarity > 60) {
          console.log(`🔄 Interim match: Verse ${match.verseId} (${match.similarity}%)`)
        }
      })
    })
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
    speechRecognition.clearTranscript()
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

      {/* Live Recognition - Sticky Section */}
      {(isListening || speechRecognition.transcript) && (
        <div className="sticky top-4 z-50 mb-6">
          <Card className="bg-blue-50 border-blue-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-800 flex items-center">
                <motion.div
                  animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
                  className="mr-2"
                >
                  <Mic className="h-5 w-5" />
                </motion.div>
                Live Recognition - {isListening ? 'Listening...' : 'Processing'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Expected Verse */}
                <div className="bg-white rounded-lg p-3 border-l-4 border-blue-400">
                  <p className="text-sm font-medium text-gray-700 mb-1">Currently Expected:</p>
                  <div className="text-right" dir="rtl">
                    <p className="text-xl text-blue-900 uthmani-font">
                      {AL_FATIHA_VERSES.find(v => v.id === currentVerse)?.arabic}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Verse {currentVerse}: {AL_FATIHA_VERSES.find(v => v.id === currentVerse)?.transliteration}
                  </p>
                </div>

                {/* Live Recognition Text */}
                {speechRecognition.transcript && (
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">What you said:</p>
                    <div className="text-right mb-3" dir="rtl">
                      <p className="text-lg text-gray-900 uthmani-font">
                        {speechRecognition.transcript}
                      </p>
                    </div>
                    
                    {speechRecognition.interimTranscript && (
                      <div className="text-right mb-3" dir="rtl">
                        <p className="text-sm text-gray-600 italic uthmani-font">
                          {speechRecognition.interimTranscript}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Recognition Results */}
                {matches.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-blue-800 text-sm">Detection Results:</p>
                    {matches.slice(0, 3).map((match, index) => (
                      <div key={index} className="flex justify-between items-center text-xs bg-white rounded p-2">
                        <span className="font-medium">Verse {match.verseId}</span>
                        <span className={`font-medium px-2 py-1 rounded ${
                          match.isCorrect 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {match.similarity.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Combined Quran Text - All Verses in One Section */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="text-xl font-semibold text-green-800 text-center">
            سُورَةُ الْفَاتِحَة - Al-Fatiha
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {AL_FATIHA_VERSES.map((verse) => (
              <motion.div
                key={verse.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: verse.id * 0.05 }}
                className={`transition-all duration-300 rounded-lg p-4 ${
                  highlightedVerses.has(verse.id) 
                    ? 'bg-green-100 border-l-4 border-green-500' 
                    : incorrectVerses.has(verse.id)
                    ? 'bg-red-100 border-l-4 border-red-500'
                    : verse.id === currentVerse
                    ? 'bg-blue-50 border-l-4 border-blue-400'
                    : 'bg-gray-50 border-l-4 border-gray-300'
                }`}
              >
                {/* Verse Header */}
                <div className="flex items-center justify-between mb-4">
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
                    <div className="text-green-600 text-sm font-medium flex items-center">
                      <span className="text-green-500 mr-1">✓</span> Correct
                    </div>
                  )}
                  
                  {incorrectVerses.has(verse.id) && (
                    <div className="text-red-600 text-sm font-medium flex items-center">
                      <span className="text-red-500 mr-1">✗</span> Needs Practice
                    </div>
                  )}
                </div>

                {/* Arabic Text - Much Bigger */}
                <div className="text-right mb-3" dir="rtl">
                  <p className="text-5xl leading-relaxed font-arabic uthmani-font" style={{
                    fontFamily: 'Amiri Quran, KFGQPC Uthman Taha Naskh, Times New Roman, serif',
                    lineHeight: '1.8'
                  }}>
                    {verse.arabic}
                  </p>
                </div>

                {/* Transliteration and Translation - Much Smaller */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 italic text-center">
                    {verse.transliteration}
                  </p>
                  <p className="text-sm text-gray-700 text-center">
                    {verse.translation}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}