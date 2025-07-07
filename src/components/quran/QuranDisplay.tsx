import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Volume2, BookOpen, Eye, EyeOff } from 'lucide-react'
import { QuranVerse, QuranWord, TajweedType } from '@/types'
import { usePreferences } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface QuranDisplayProps {
  verses: QuranVerse[]
  currentVerseId?: string
  highlightedWords?: string[]
  currentWordId?: string
  incorrectWords?: string[]
  onWordClick?: (wordId: string) => void
  onVerseSelect?: (verseId: string) => void
  onPlayAudio?: (verseId: string) => void
  className?: string
}

interface QuranWordProps {
  word: QuranWord
  isHighlighted?: boolean
  isCurrent?: boolean
  isIncorrect?: boolean
  tajweedEnabled?: boolean
  fontSize: string
  onClick?: () => void
}

const QuranWordComponent = React.memo(({
  word,
  isHighlighted = false,
  isCurrent = false,
  isIncorrect = false,
  tajweedEnabled = false,
  fontSize,
  onClick
}: QuranWordProps) => {
  const getTajweedClass = (tajweedClass?: string): string => {
    if (!tajweedEnabled || !tajweedClass) return ''
    
    const tajweedClasses: Record<TajweedType, string> = {
      ikhfaa: 'tajweed-ikhfaa',
      idgham: 'tajweed-idgham',
      iqlab: 'tajweed-iqlab',
      izhar: 'tajweed-izhar',
      qalqalah: 'tajweed-qalqalah',
      madd: 'tajweed-madd',
      heavy: 'tajweed-heavy',
      light: 'tajweed-light',
      shaddah: 'tajweed-shaddah',
      sukun: 'tajweed-sukun',
      waqf: 'tajweed-waqf'
    }
    
    return tajweedClasses[tajweedClass as TajweedType] || ''
  }

  const fontSizeClasses = {
    small: 'text-quran-sm',
    medium: 'text-quran-md',
    large: 'text-quran-lg',
    xlarge: 'text-quran-xl'
  }

  return (
    <motion.span
      className={cn(
        'quran-word arabic-text inline-block cursor-pointer select-none',
        fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses.medium,
        getTajweedClass(word.tajweedClass),
        {
          'highlighted': isHighlighted,
          'current': isCurrent,
          'incorrect': isIncorrect
        }
      )}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      title={`${word.transliteration} - ${word.translation}`}
    >
      {word.arabicText}
    </motion.span>
  )
})

QuranWordComponent.displayName = 'QuranWord'

export function QuranDisplay({
  verses,
  currentVerseId,
  highlightedWords = [],
  currentWordId,
  incorrectWords = [],
  onWordClick,
  onVerseSelect,
  onPlayAudio,
  className
}: QuranDisplayProps) {
  const preferences = usePreferences()

  // Parse verses into words for better control
  const parsedVerses = useMemo(() => {
    return verses.map(verse => {
      // Split Arabic text into words and create word objects
      const words = verse.arabicText.split(/\s+/).map((text, index) => ({
        id: `${verse.id}-word-${index}`,
        verseId: verse.id,
        position: index,
        arabicText: text,
        transliteration: `word-${index}`, // This would come from your data
        translation: `word ${index + 1}`, // This would come from your data
        tajweedClass: undefined // This would be determined by tajweed analysis
      }))
      
      return {
        ...verse,
        words
      }
    })
  }, [verses])

  const handleWordClick = (wordId: string) => {
    onWordClick?.(wordId)
  }

  const handleVerseSelect = (verseId: string) => {
    onVerseSelect?.(verseId)
  }

  const handlePlayAudio = (verseId: string) => {
    onPlayAudio?.(verseId)
  }

  return (
    <div className={cn('space-y-6', className)}>
      <AnimatePresence>
        {parsedVerses.map((verse, verseIndex) => (
          <motion.div
            key={verse.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: verseIndex * 0.1 }}
          >
            <Card 
              className={cn(
                'transition-all duration-200 hover:shadow-md',
                currentVerseId === verse.id && 'ring-2 ring-green-600 ring-opacity-50 bg-green-50'
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-green-700">
                    <BookOpen className="mr-2 inline h-5 w-5" />
                    Surah {verse.surahNumber}, Verse {verse.verseNumber}
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    {verse.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayAudio(verse.id)}
                        className="text-green-700 hover:text-green-600"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant={currentVerseId === verse.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleVerseSelect(verse.id)}
                    >
                      {currentVerseId === verse.id ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Arabic Text */}
                <div 
                  className="rtl min-h-[120px] rounded-lg bg-white p-6 shadow-inner"
                  dir="rtl"
                >
                  <div className="leading-relaxed">
                    {verse.words?.map((word) => (
                      <React.Fragment key={word.id}>
                        <QuranWordComponent
                          word={word}
                          isHighlighted={highlightedWords.includes(word.id)}
                          isCurrent={currentWordId === word.id}
                          isIncorrect={incorrectWords.includes(word.id)}
                          tajweedEnabled={preferences.tajweedHighlighting}
                          fontSize={preferences.arabicFontSize}
                          onClick={() => handleWordClick(word.id)}
                        />
                        {' '}
                      </React.Fragment>
                    )) || (
                      <span 
                        className={cn(
                          'arabic-text',
                          preferences.arabicFontSize === 'small' && 'text-quran-sm',
                          preferences.arabicFontSize === 'medium' && 'text-quran-md',
                          preferences.arabicFontSize === 'large' && 'text-quran-lg',
                          preferences.arabicFontSize === 'xlarge' && 'text-quran-xl'
                        )}
                      >
                        {verse.arabicText}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Transliteration */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Transliteration:</p>
                  <p className="text-gray-600 italic leading-relaxed">
                    {verse.transliteration}
                  </p>
                </div>
                
                {/* Translation */}
                <div className="rounded-lg bg-orange-50 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Translation:</p>
                  <p className="text-gray-800 leading-relaxed">
                    {verse.translation}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Tajweed Legend */}
      <AnimatePresence>
        {preferences.tajweedHighlighting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-yellow-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-700 flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Tajweed Color Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-ikhfaa"></div>
                    <span>Ikhfaa</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-idgham"></div>
                    <span>Idgham</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-iqlab"></div>
                    <span>Iqlab</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-izhar"></div>
                    <span>Izhar</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-qalqalah"></div>
                    <span>Qalqalah</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-madd"></div>
                    <span>Madd</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-heavy"></div>
                    <span>Heavy Letters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded tajweed-shaddah"></div>
                    <span>Shaddah</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Empty State */}
      {verses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No verses loaded</h3>
            <p className="text-gray-600">
              Please select a Surah and verses to begin your recitation practice.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}