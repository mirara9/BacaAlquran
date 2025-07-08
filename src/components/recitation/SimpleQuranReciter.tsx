import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Volume2 } from 'lucide-react'
import { useRealtimeSpeechRecognition } from '@/hooks/useRealtimeSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useAudioPlayer'
import { cleanArabicText, calculateSimilarity } from '@/lib/utils'
import { SpeechRecognitionFallback } from '@/components/SpeechRecognitionFallback'

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
  // const [isListening, setIsListening] = useState(false)
  const [matches, setMatches] = useState<RecitationMatch[]>([])
  const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(null)

  const { speak } = useTextToSpeech()

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
      }
    }
  }, [silenceTimeout])

  // Speech recognition with chunked processing
  const speechRecognition = useRealtimeSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      const fullTranscript = result.transcript.trim()
      console.log('🎤 Full transcript received:', fullTranscript)
      
      // Clear any existing silence timeout since we have new speech
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
        setSilenceTimeout(null)
      }
      
      handleSpeechResult(fullTranscript)
      
      // Set a 1-second timeout to clear transcript after silence
      const newTimeout = setTimeout(() => {
        clearTranscriptForNewAttempt()
      }, 1000)
      setSilenceTimeout(newTimeout)
    },
    onInterimResult: (interimText) => {
      // Process interim results for real-time highlighting
      if (interimText.trim()) {
        // Clear existing timeout since we have ongoing speech
        if (silenceTimeout) {
          clearTimeout(silenceTimeout)
          setSilenceTimeout(null)
        }
        processInterimSpeech(interimText)
      }
    },
    onStart: () => {
      // setIsListening(true)
      // Clear any existing timeouts when starting
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
        setSilenceTimeout(null)
      }
    },
    onEnd: () => {
      // setIsListening(false)
      // Clear timeout when stopping
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
        setSilenceTimeout(null)
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error)
      // setIsListening(false)
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
        setSilenceTimeout(null)
      }
    }
  })

  // Clear transcript and reset for new verse attempt
  const clearTranscriptForNewAttempt = useCallback(() => {
    if (silenceTimeout) {
      clearTimeout(silenceTimeout)
      setSilenceTimeout(null)
    }
    
    speechRecognition.clearTranscript()
    console.log('🧹 Cleared transcript after silence - ready for new verse attempt')
  }, [silenceTimeout, speechRecognition])

  // Advance to next verse and preserve highlights
  const advanceToNextVerse = useCallback((nextVerseId: number) => {
    console.log(`🔄 Advancing from verse ${currentVerse} to verse ${nextVerseId}`)
    setCurrentVerse(nextVerseId)
    clearTranscriptForNewAttempt() // Clear transcript for fresh start
    console.log('🧹 Advanced to new verse (preserved highlights)')
  }, [currentVerse, clearTranscriptForNewAttempt])

  // Process final speech recognition results
  const handleSpeechResult = useCallback((transcript: string) => {
    if (!transcript.trim()) return

    console.log('🎤 Full Speech Result:', transcript)
    console.log('🎯 Current Expected Verse:', currentVerse)
    
    // PRESERVE previous highlights - don't reset them
    const newHighlighted = new Set(highlightedVerses)
    const newIncorrect = new Set(incorrectVerses)
    let allMatches: RecitationMatch[] = [...matches] // Keep previous matches too
    let highestVerseFound = currentVerse - 1

    // NEW LOGIC: Check for multiple verses in sequence
    console.log('🔍 Checking for multiple verses in transcript...')
    
    // Check each verse from current onwards to see if it's in the transcript
    const versesToCheck = AL_FATIHA_VERSES.filter(v => v.id >= currentVerse)
    let foundSequentialVerses: number[] = []
    
    for (const verse of versesToCheck) {
      const similarity = calculateArabicSimilarity(transcript, verse.arabic)
      console.log(`🔍 Verse ${verse.id} similarity: ${similarity}%`)
      
      if (similarity >= 65) {
        newHighlighted.add(verse.id)
        newIncorrect.delete(verse.id)
        foundSequentialVerses.push(verse.id)
        highestVerseFound = Math.max(highestVerseFound, verse.id)
        
        console.log(`✅ Verse ${verse.id} marked as correct (${similarity}%)`)
        
        allMatches.push({
          verseId: verse.id,
          matchedText: transcript,
          similarity,
          isCorrect: true
        })
      }
    }

    // If we found multiple verses, log it
    if (foundSequentialVerses.length > 1) {
      console.log(`🎯 Multiple verses detected: ${foundSequentialVerses.join(', ')}`)
    }

    // If we found any verses, advance to the next unread verse
    if (foundSequentialVerses.length > 0) {
      console.log(`🎯 Found sequential verses: [${foundSequentialVerses.join(', ')}], highest: ${highestVerseFound}`)
      const nextVerseId = Math.min(highestVerseFound + 1, AL_FATIHA_VERSES.length)
      console.log(`🔄 Will advance to verse: ${nextVerseId}`)
      if (nextVerseId <= AL_FATIHA_VERSES.length) {
        advanceToNextVerse(nextVerseId)
      }
      // Skip fallback processing since we already found valid matches
    } else {
      // Fallback: try the segmentation approach for complex cases
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
          
          if (similarity >= 60) { // Lowered threshold for testing
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

      // If no valid matches found, check if we should mark current verse as incorrect
      const currentVerseData = AL_FATIHA_VERSES.find(v => v.id === currentVerse)
      if (!foundValidMatch && currentVerseData) {
        const currentVerseSimilarity = calculateArabicSimilarity(transcript, currentVerseData.arabic)
        if (currentVerseSimilarity < 65) {
          console.log(`❌ Current verse ${currentVerse} marked as incorrect (${currentVerseSimilarity}%) - incomplete or wrong recitation`)
          // Mark as incorrect if similarity is below threshold
          newIncorrect.add(currentVerse)
          newHighlighted.delete(currentVerse)
          
          // Cancel any pending timeout so the transcript stays visible for incorrect attempts
          if (silenceTimeout) {
            clearTimeout(silenceTimeout)
            setSilenceTimeout(null)
            console.log('🚫 Cancelled transcript clearing - keeping incorrect input visible')
          }
          
          // Set a longer timeout (5 seconds) for incorrect attempts so user can see what they said
          const incorrectTimeout = setTimeout(() => {
            clearTranscriptForNewAttempt()
            console.log('🧹 Cleared transcript after showing incorrect attempt')
          }, 5000)
          setSilenceTimeout(incorrectTimeout)
        }
      }
    }
    
    console.log(`🎨 Updating highlights:`, Array.from(newHighlighted))
    console.log(`❌ Updating incorrect:`, Array.from(newIncorrect))
    setHighlightedVerses(newHighlighted)
    setIncorrectVerses(newIncorrect)
    setMatches(allMatches)
    
  }, [currentVerse, highlightedVerses, incorrectVerses, matches, advanceToNextVerse])

  // Extract individual verse segments from continuous speech
  const extractVerseSegments = (transcript: string): { text: string; startIndex: number }[] => {
    const segments: { text: string; startIndex: number }[] = []
    const normalizedTranscript = cleanArabicText(transcript.trim())
    
    // Known verse patterns and key phrases for segmentation
    // const verseMarkers = [
    //   'بسم الله', 'الحمد لله', 'الرحمن الرحيم', 'مالك يوم الدين', 
    //   'اياك نعبد', 'اهدنا الصراط', 'صراط الذين'
    // ]
    
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

  // Calculate similarity between spoken text and verse with strict validation
  const calculateArabicSimilarity = (spoken: string, expected: string): number => {
    const normalizedSpoken = cleanArabicText(spoken.trim())
    const normalizedExpected = cleanArabicText(expected.trim())
    
    console.log(`🔍 Original texts:`)
    console.log(`   Spoken: "${spoken.trim()}"`)
    console.log(`   Expected: "${expected.trim()}"`)
    console.log(`🔍 After normalization:`)
    console.log(`   Spoken: "${normalizedSpoken}"`)
    console.log(`   Expected: "${normalizedExpected}"`)
    console.log(`   Lengths: spoken=${normalizedSpoken.length}, expected=${normalizedExpected.length}`)
    
    // Debug: Character-by-character comparison
    console.log(`🔍 Character comparison:`)
    const spokenChars = normalizedSpoken.split('')
    const expectedChars = normalizedExpected.split('')
    console.log(`   Spoken chars: [${spokenChars.map(c => c + '(' + c.charCodeAt(0) + ')').join(', ')}]`)
    console.log(`   Expected chars: [${expectedChars.map(c => c + '(' + c.charCodeAt(0) + ')').join(', ')}]`)
    
    // Quick check: if they're exactly the same after normalization, it's 100%
    if (normalizedSpoken === normalizedExpected) {
      console.log(`✅ EXACT MATCH after normalization - 100%`)
      return 100
    } else {
      console.log(`❌ NOT exact match`)
      // Show where they differ
      for (let i = 0; i < Math.max(normalizedSpoken.length, normalizedExpected.length); i++) {
        if (normalizedSpoken[i] !== normalizedExpected[i]) {
          console.log(`   First difference at position ${i}: '${normalizedSpoken[i] || '(end)'}' vs '${normalizedExpected[i] || '(end)'}`)
          break
        }
      }
    }
    
    // Strict validation: Check if the spoken text contains the complete expected verse
    // The spoken text should include all major words from the expected verse
    
    const spokenWords = normalizedSpoken.split(/\s+/).filter(word => word.length > 1)
    const expectedWords = normalizedExpected.split(/\s+/).filter(word => word.length > 1)
    
    console.log(`📝 Spoken words: [${spokenWords.join(', ')}]`)
    console.log(`📝 Expected words: [${expectedWords.join(', ')}]`)
    
    // Count how many expected words are found in spoken text
    let foundWords = 0
    let totalExpectedWords = expectedWords.length
    
    expectedWords.forEach((expectedWord) => {
      // Check if this expected word (or very similar) appears in spoken text
      let bestMatch = 0
      let bestMatchWord = ''
      
      spokenWords.forEach(spokenWord => {
        // Normalize both words before comparison
        const normalizedSpokenWord = cleanArabicText(spokenWord)
        const normalizedExpectedWord = cleanArabicText(expectedWord)
        const wordSimilarity = calculateSimilarity(normalizedSpokenWord, normalizedExpectedWord)
        if (wordSimilarity > bestMatch) {
          bestMatch = wordSimilarity
          bestMatchWord = spokenWord
        }
      })
      
      if (bestMatch >= 70) { // Lowered from 80% to 70% for Arabic speech recognition
        foundWords++
        console.log(`✅ Found word match: "${expectedWord}" ≈ "${bestMatchWord}" (${bestMatch}%)`)
      } else {
        console.log(`❌ Missing word: "${expectedWord}" (best match: "${bestMatchWord}" at ${bestMatch}%)`)
      }
    })
    
    // Calculate percentage of expected words found
    const wordCoverage = (foundWords / totalExpectedWords) * 100
    console.log(`📊 Word coverage: ${foundWords}/${totalExpectedWords} = ${wordCoverage.toFixed(1)}%`)
    
    // Additional check: Make sure spoken text doesn't have too many extra words
    const extraWordsRatio = spokenWords.length / expectedWords.length
    console.log(`📏 Length ratio: ${extraWordsRatio.toFixed(2)} (spoken/expected)`)
    
    // Calculate overall string similarity
    const overallSimilarity = calculateSimilarity(normalizedSpoken, normalizedExpected)
    console.log(`🎯 Overall similarity: ${overallSimilarity}%`)
    
    // More lenient requirements for correct pronunciation:
    // 1. Must have at least 70% of expected words (further reduced for Arabic speech recognition)
    // 2. Shouldn't be more than 200% longer than expected (more lenient) 
    // 3. Overall similarity should be at least 50% (further reduced)
    
    if (wordCoverage >= 70 && extraWordsRatio <= 2.0 && overallSimilarity >= 50) {
      const finalScore = Math.max(wordCoverage, overallSimilarity)
      console.log(`✅ PASSED lenient validation with score: ${finalScore}%`)
      return finalScore
    } else {
      console.log(`❌ FAILED validation - Coverage: ${wordCoverage}%, Ratio: ${extraWordsRatio}, Overall: ${overallSimilarity}%`)
      // Give partial credit even for failed validation
      const partialScore = Math.max(wordCoverage * 0.8, overallSimilarity * 0.8)
      return Math.min(partialScore, 70) // Cap at 70% for failed strict validation
    }
  }

  // const handleStartListening = () => {
  //   speechRecognition.startListening()
  // }

  // const handleStopListening = () => {
  //   speechRecognition.stopListening()
  // }

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
    
    // Clear any existing timeout
    if (silenceTimeout) {
      clearTimeout(silenceTimeout)
      setSilenceTimeout(null)
    }
  }

  // const getVerseStatusColor = (verseId: number) => {
  //   if (highlightedVerses.has(verseId)) {
  //     return 'bg-green-100 border-green-300 text-green-900'
  //   }
  //   if (incorrectVerses.has(verseId)) {
  //     return 'bg-red-100 border-red-300 text-red-900'
  //   }
  //   if (verseId === currentVerse) {
  //     return 'bg-blue-50 border-blue-300 text-blue-900'
  //   }
  //   return 'bg-white border-gray-200'
  // }

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
          <div className="space-y-4 mb-4">
            <SpeechRecognitionFallback
              onTranscript={handleSpeechResult}
              onError={(error) => {
                console.error('Speech recognition error:', error);
              }}
              language="ar-SA"
              continuous={true}
            />
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={resetRecitation}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="text-center text-sm text-gray-600">
            Completed: {highlightedVerses.size} / {AL_FATIHA_VERSES.length} verses
          </div>
        </CardContent>
      </Card>

      {/* Current Verse Guide */}
      {currentVerse <= AL_FATIHA_VERSES.length && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-700 mb-3">Currently expecting verse {currentVerse}:</p>
              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-400">
                <div className="text-right" dir="rtl">
                  <p className="text-xl mb-2 uthmani-font text-gray-900">
                    {AL_FATIHA_VERSES.find(v => v.id === currentVerse)?.arabic}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  {AL_FATIHA_VERSES.find(v => v.id === currentVerse)?.transliteration}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {AL_FATIHA_VERSES.find(v => v.id === currentVerse)?.translation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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