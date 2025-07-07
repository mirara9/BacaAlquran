import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Volume2, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'
import { QuranVerse, QuranWord } from '@/types'
import { usePreferences } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface ContinuousQuranDisplayProps {
  verses: QuranVerse[]
  currentVerseId?: string
  highlightedWords?: string[]
  currentWordId?: string
  incorrectWords?: string[]
  onWordClick?: (wordId: string) => void
  onPlayAudio?: (verseId: string) => void
  className?: string
}

interface QuranWordProps {
  word: QuranWord
  isCorrect?: boolean
  isIncorrect?: boolean
  isCurrent?: boolean
  tajweedEnabled?: boolean
  fontSize: string
  onClick?: () => void
}

// Enhanced tajweed analysis for Arabic text
const getTajweedClass = (arabicWord: string, position: number): string => {
  // Basic tajweed rule detection based on Arabic letters
  // This is a simplified version - in production you'd use a comprehensive tajweed library
  
  const word = arabicWord.trim()
  
  // Noon Sakinah and Tanween rules
  if (word.includes('نْ') || word.includes('ً') || word.includes('ٌ') || word.includes('ٍ')) {
    const nextChar = word[position + 1]
    if (nextChar && 'يرملنو'.includes(nextChar)) {
      return 'tajweed-idgham' // Idgham
    }
    if (nextChar && 'بمف'.includes(nextChar)) {
      return 'tajweed-iqlab' // Iqlab
    }
    if (nextChar && 'تثجدذزسشصضطظفقكخغ'.includes(nextChar)) {
      return 'tajweed-ikhfaa' // Ikhfaa
    }
    return 'tajweed-izhar' // Izhar
  }
  
  // Qalqalah letters
  if (word.includes('قطبجد')) {
    return 'tajweed-qalqalah'
  }
  
  // Madd letters
  if (word.includes('ا') || word.includes('و') || word.includes('ي')) {
    return 'tajweed-madd'
  }
  
  // Heavy letters (استعلاء)
  if (word.match(/[خصضغطقظذ]/)) {
    return 'tajweed-heavy'
  }
  
  // Shaddah
  if (word.includes('ّ')) {
    return 'tajweed-shaddah'
  }
  
  // Sukun
  if (word.includes('ْ')) {
    return 'tajweed-sukun'
  }
  
  return ''
}

const QuranWordComponent = ({
  word,
  isCorrect = false,
  isIncorrect = false,
  isCurrent = false,
  tajweedEnabled = false,
  fontSize,
  onClick
}: QuranWordProps) => {
  const tajweedClass = tajweedEnabled ? getTajweedClass(word.arabicText, word.position) : ''
  
  const fontSizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl',
    xlarge: 'text-5xl'
  }

  return (
    <motion.span
      className={cn(
        'quran-word arabic-text inline-block cursor-pointer select-none transition-all duration-300 px-1 py-0.5 rounded mx-0.5',
        fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses.medium,
        tajweedClass,
        {
          'bg-green-200 text-green-800 shadow-sm': isCorrect,
          'bg-red-200 text-red-800 shadow-sm': isIncorrect,
          'ring-2 ring-blue-400 ring-opacity-70 bg-blue-50': isCurrent,
          'hover:bg-gray-100': !isCorrect && !isIncorrect && !isCurrent
        }
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      title={`${word.transliteration || word.arabicText} - Click to hear pronunciation`}
    >
      {word.arabicText}
    </motion.span>
  )
}

export function ContinuousQuranDisplay({
  verses,
  highlightedWords = [],
  currentWordId,
  incorrectWords = [],
  onWordClick,
  onPlayAudio,
  className
}: ContinuousQuranDisplayProps) {
  const preferences = usePreferences()

  // Parse all verses into a continuous word list
  const allWords = useMemo(() => {
    const words: (QuranWord & { verseInfo: string })[] = []
    
    verses.forEach(verse => {
      // Use predefined word data if available, otherwise split the text
      if (verse.words && verse.words.length > 0) {
        verse.words.forEach((wordData, index) => {
          words.push({
            id: `${verse.id}-word-${index}`,
            verseId: verse.id,
            position: index,
            arabicText: wordData.arabic,
            transliteration: wordData.transliteration,
            translation: wordData.translation,
            verseInfo: `${verse.surahNumber}:${verse.verseNumber}`,
            audioTimestamp: {
              start: index * 0.8,
              end: (index + 1) * 0.8
            }
          })
        })
      } else {
        // Fallback to splitting text
        const arabicWords = verse.arabicText.split(/\s+/)
        const transliterationWords = verse.transliteration?.split(/\s+/) || []
        
        arabicWords.forEach((arabicText, index) => {
          words.push({
            id: `${verse.id}-word-${index}`,
            verseId: verse.id,
            position: index,
            arabicText: arabicText.trim(),
            transliteration: transliterationWords[index] || '',
            translation: `Word ${index + 1} of verse ${verse.verseNumber}`,
            verseInfo: `${verse.surahNumber}:${verse.verseNumber}`,
            audioTimestamp: {
              start: index * 0.8,
              end: (index + 1) * 0.8
            }
          })
        })
      }
      
      // Add verse separator
      words.push({
        id: `${verse.id}-separator`,
        verseId: verse.id,
        position: -1,
        arabicText: `۝${verse.verseNumber}`,
        transliteration: '',
        translation: `End of verse ${verse.verseNumber}`,
        verseInfo: `${verse.surahNumber}:${verse.verseNumber}`,
        audioTimestamp: { start: 0, end: 0 }
      })
    })
    
    return words
  }, [verses])

  const handleWordClick = (wordId: string) => {
    onWordClick?.(wordId)
    
    // Find the verse this word belongs to and play its audio
    const word = allWords.find(w => w.id === wordId)
    if (word && onPlayAudio) {
      onPlayAudio(word.verseId)
    }
  }

  const getWordStatus = (wordId: string) => {
    const isCorrect = highlightedWords.includes(wordId)
    const isIncorrect = incorrectWords.includes(wordId)
    const isCurrent = currentWordId === wordId
    
    return { isCorrect, isIncorrect, isCurrent }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Continuous Quran Text */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-green-800 flex items-center">
              <BookOpen className="mr-3 h-6 w-6" />
              Al-Quran - Continuous Reading
            </CardTitle>
            
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span className="text-green-700">Correct</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span className="text-red-700">Incorrect</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded"></div>
                <span className="text-blue-700">Next Expected</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          <div 
            className="rtl leading-loose text-right"
            dir="rtl"
            style={{ lineHeight: '2.5' }}
          >
            {allWords.map((word) => {
              if (word.position === -1) {
                // Verse separator
                return (
                  <span
                    key={word.id}
                    className="inline-block mx-4 my-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200"
                  >
                    {word.arabicText}
                  </span>
                )
              }
              
              const { isCorrect, isIncorrect, isCurrent } = getWordStatus(word.id)
              
              return (
                <QuranWordComponent
                  key={word.id}
                  word={word}
                  isCorrect={isCorrect}
                  isIncorrect={isIncorrect}
                  isCurrent={isCurrent}
                  tajweedEnabled={preferences.tajweedHighlighting}
                  fontSize={preferences.arabicFontSize}
                  onClick={() => handleWordClick(word.id)}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Panel */}
      {(highlightedWords.length > 0 || incorrectWords.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Correct Words */}
          {highlightedWords.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800 flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Correct Words ({highlightedWords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 text-sm">
                  Great job! These words were recited correctly with proper pronunciation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Incorrect Words */}
          {incorrectWords.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800 flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Needs Practice ({incorrectWords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 text-sm mb-3">
                  These words need attention. Click on them to hear the correct pronunciation:
                </p>
                <div className="space-y-2">
                  {incorrectWords.slice(0, 5).map(wordId => {
                    const word = allWords.find(w => w.id === wordId)
                    return word ? (
                      <div key={wordId} className="flex items-center justify-between">
                        <span className="arabic-text text-lg">{word.arabicText}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWordClick(wordId)}
                          className="text-red-700 border-red-200 hover:bg-red-100"
                        >
                          <Volume2 className="h-3 w-3 mr-1" />
                          Listen
                        </Button>
                      </div>
                    ) : null
                  })}
                  {incorrectWords.length > 5 && (
                    <p className="text-xs text-red-600">
                      ...and {incorrectWords.length - 5} more words
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Tajweed Legend */}
      {preferences.tajweedHighlighting && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-amber-800">
              Tajweed Color Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-purple-200 border border-purple-300"></div>
                <span>Ikhfaa</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-blue-200 border border-blue-300"></div>
                <span>Idgham</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-pink-200 border border-pink-300"></div>
                <span>Iqlab</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-yellow-200 border border-yellow-300"></div>
                <span>Izhar</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-indigo-200 border border-indigo-300"></div>
                <span>Qalqalah</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-orange-200 border border-orange-300"></div>
                <span>Madd</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}