import { QuranWord } from '@/types'
import { cleanArabicText, calculateSimilarity } from '@/lib/utils'

export interface WordMatch {
  expectedWord: QuranWord
  spokenWord: string
  similarity: number
  isMatch: boolean
  position: number
}

export interface MatchingResult {
  matches: WordMatch[]
  currentWordIndex: number
  highlightedWords: string[]
  incorrectWords: string[]
  accuracy: number
  nextExpectedWord?: QuranWord
}

/**
 * Clean and normalize Arabic text for comparison
 */
export function normalizeArabicText(text: string): string {
  return cleanArabicText(text)
    .replace(/[ً-ٍ]/g, '') // Remove short vowels
    .replace(/[ؤئء]/g, 'ا') // Normalize alif variations
    .replace(/ة/g, 'ه') // Normalize taa marbouta
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase()
}

/**
 * Calculate word similarity with Arabic-specific logic
 */
export function calculateArabicWordSimilarity(word1: string, word2: string): number {
  const normalized1 = normalizeArabicText(word1)
  const normalized2 = normalizeArabicText(word2)
  
  // Exact match gets 100%
  if (normalized1 === normalized2) {
    return 100
  }
  
  // Check if one word contains the other (partial match)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 85
  }
  
  // Use Levenshtein distance for similarity
  const similarity = calculateSimilarity(normalized1, normalized2)
  
  // Boost similarity for Arabic-specific patterns
  if (similarity >= 70) {
    // Check for common Arabic root patterns
    const root1 = extractArabicRoot(normalized1)
    const root2 = extractArabicRoot(normalized2)
    
    if (root1 && root2 && root1 === root2) {
      return Math.max(similarity, 80)
    }
  }
  
  return similarity
}

/**
 * Simple Arabic root extraction (very basic implementation)
 */
function extractArabicRoot(word: string): string | null {
  // This is a simplified approach - in reality, Arabic root extraction is complex
  const normalized = word.replace(/[اوي]/g, '') // Remove weak letters
  return normalized.length >= 3 ? normalized.substring(0, 3) : null
}

/**
 * Match spoken words against expected Quran verse
 */
export function matchSpokenWords(
  spokenText: string,
  expectedWords: QuranWord[],
  currentWordIndex: number = 0,
  similarityThreshold: number = 70
): MatchingResult {
  const spokenWords = spokenText.trim().split(/\s+/).filter(word => word.length > 0)
  const matches: WordMatch[] = []
  const highlightedWords: string[] = []
  const incorrectWords: string[] = []
  
  let currentIndex = currentWordIndex
  let totalSimilarity = 0
  let matchedCount = 0
  
  // Process each spoken word
  for (let i = 0; i < spokenWords.length; i++) {
    const spokenWord = spokenWords[i]
    let bestMatch: WordMatch | null = null
    let bestMatchIndex = -1
    
    // Look for the best match within a reasonable window
    const searchWindow = Math.min(expectedWords.length, currentIndex + 5)
    
    for (let j = currentIndex; j < searchWindow; j++) {
      if (j >= expectedWords.length) break
      
      const expectedWord = expectedWords[j]
      const similarity = calculateArabicWordSimilarity(spokenWord, expectedWord.arabicText)
      
      if (similarity >= similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            expectedWord,
            spokenWord,
            similarity,
            isMatch: true,
            position: j
          }
          bestMatchIndex = j
        }
      }
    }
    
    if (bestMatch) {
      matches.push(bestMatch)
      highlightedWords.push(bestMatch.expectedWord.id)
      currentIndex = Math.max(currentIndex, bestMatchIndex + 1)
      totalSimilarity += bestMatch.similarity
      matchedCount++
    } else {
      // Look for any word that might be close (for incorrect highlighting)
      for (let j = Math.max(0, currentIndex - 2); j < Math.min(expectedWords.length, currentIndex + 3); j++) {
        const expectedWord = expectedWords[j]
        const similarity = calculateArabicWordSimilarity(spokenWord, expectedWord.arabicText)
        
        if (similarity >= 40 && similarity < similarityThreshold) {
          incorrectWords.push(expectedWord.id)
          matches.push({
            expectedWord,
            spokenWord,
            similarity,
            isMatch: false,
            position: j
          })
          break
        }
      }
    }
  }
  
  // Calculate overall accuracy
  const accuracy = matchedCount > 0 ? Math.round(totalSimilarity / matchedCount) : 0
  
  // Determine next expected word
  const nextExpectedWord = currentIndex < expectedWords.length ? expectedWords[currentIndex] : undefined
  
  return {
    matches,
    currentWordIndex: currentIndex,
    highlightedWords,
    incorrectWords,
    accuracy,
    nextExpectedWord
  }
}

/**
 * Real-time word matching for continuous speech recognition
 */
export function matchRealTimeWords(
  interimText: string,
  finalText: string,
  expectedWords: QuranWord[],
  currentWordIndex: number = 0
): {
  currentWordId?: string
  nextWordId?: string
  progress: number
} {
  const allText = (finalText + ' ' + interimText).trim()
  const result = matchSpokenWords(allText, expectedWords, currentWordIndex, 60)
  
  const progress = (result.currentWordIndex / expectedWords.length) * 100
  const currentWordId = result.nextExpectedWord?.id
  const nextWordId = result.currentWordIndex + 1 < expectedWords.length 
    ? expectedWords[result.currentWordIndex + 1]?.id 
    : undefined
  
  return {
    currentWordId,
    nextWordId,
    progress
  }
}

/**
 * Generate pronunciation feedback
 */
export function generatePronunciationFeedback(matches: WordMatch[]): {
  overallScore: number
  feedback: string[]
  suggestions: string[]
} {
  if (matches.length === 0) {
    return {
      overallScore: 0,
      feedback: ['No words detected. Please speak more clearly.'],
      suggestions: ['Ensure your microphone is working', 'Speak closer to the microphone', 'Reduce background noise']
    }
  }
  
  const correctMatches = matches.filter(m => m.isMatch)
  const overallScore = Math.round(
    correctMatches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
  )
  
  const feedback: string[] = []
  const suggestions: string[] = []
  
  if (overallScore >= 90) {
    feedback.push('Excellent pronunciation! Well done.')
  } else if (overallScore >= 80) {
    feedback.push('Good pronunciation with minor improvements needed.')
  } else if (overallScore >= 70) {
    feedback.push('Fair pronunciation. Practice will help improve accuracy.')
  } else {
    feedback.push('Pronunciation needs improvement. Take your time.')
  }
  
  // Analyze specific issues
  const lowScoreWords = matches.filter(m => m.similarity < 70)
  if (lowScoreWords.length > 0) {
    feedback.push(`${lowScoreWords.length} word(s) need attention.`)
    suggestions.push('Focus on difficult words individually')
    suggestions.push('Listen to reference pronunciation')
  }
  
  const incorrectWords = matches.filter(m => !m.isMatch)
  if (incorrectWords.length > 0) {
    suggestions.push('Practice problem words slowly')
    suggestions.push('Pay attention to long and short vowels')
  }
  
  return {
    overallScore,
    feedback,
    suggestions
  }
}