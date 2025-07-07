// Core types for the Quran recitation app

export interface QuranVerse {
  id: string
  surahNumber: number
  verseNumber: number
  arabicText: string
  transliteration: string
  translation: string
  audioUrl?: string
  tajweedRules?: TajweedRule[]
}

export interface QuranWord {
  id: string
  verseId: string
  position: number
  arabicText: string
  transliteration: string
  translation: string
  tajweedClass?: string
  audioTimestamp?: {
    start: number
    end: number
  }
}

export interface TajweedRule {
  type: TajweedType
  position: {
    start: number
    end: number
  }
  description: string
  audioExample?: string
}

export type TajweedType = 
  | 'ikhfaa'
  | 'idgham'
  | 'iqlab'
  | 'izhar'
  | 'qalqalah'
  | 'madd'
  | 'heavy'
  | 'light'
  | 'shaddah'
  | 'sukun'
  | 'waqf'

export interface RecitationSession {
  id: string
  userId: string
  verseId: string
  startTime: Date
  endTime?: Date
  audioBlob?: Blob
  audioUrl?: string
  transcription?: string
  accuracy?: number
  errors: RecitationError[]
  feedback?: AIFeedback
  status: 'recording' | 'processing' | 'completed' | 'failed'
}

export interface RecitationError {
  id: string
  wordPosition: number
  expectedText: string
  actualText: string
  errorType: 'pronunciation' | 'missing' | 'extra' | 'tajweed'
  confidence: number
  timestamp: {
    start: number
    end: number
  }
  correction?: {
    audioUrl: string
    description: string
  }
}

export interface AIFeedback {
  overallScore: number
  pronunciationScore: number
  tajweedScore: number
  fluencyScore: number
  suggestions: string[]
  corrections: ErrorCorrection[]
  nextSteps: string[]
}

export interface ErrorCorrection {
  wordPosition: number
  issue: string
  explanation: string
  practiceAudio: string
  tajweedRule?: TajweedRule
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  preferences: UserPreferences
  progress: UserProgress
  createdAt: Date
  lastActive: Date
}

export interface UserPreferences {
  qariVoice: string
  playbackSpeed: number
  autoCorrection: boolean
  tajweedHighlighting: boolean
  feedbackLevel: 'basic' | 'detailed' | 'advanced'
  arabicFontSize: 'small' | 'medium' | 'large' | 'xlarge'
  theme: 'light' | 'dark' | 'auto'
  language: string
}

export interface UserProgress {
  totalSessions: number
  averageAccuracy: number
  versesCompleted: number
  currentLevel: number
  streak: number
  achievements: Achievement[]
  weeklyStats: WeeklyStats[]
  strongAreas: string[]
  improvementAreas: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: Date
  category: 'accuracy' | 'consistency' | 'progress' | 'special'
}

export interface WeeklyStats {
  week: string
  sessionsCount: number
  averageAccuracy: number
  totalMinutes: number
  versesCompleted: number
}

export interface AudioRecordingState {
  isRecording: boolean
  isProcessing: boolean
  duration: number
  volume: number
  error?: string
}

export interface SpeechToTextResult {
  transcript: string
  confidence: number
  words: {
    word: string
    confidence: number
    startTime: number
    endTime: number
  }[]
  language: string
  alternativeTranscripts?: string[]
}

export interface ComparisonResult {
  accuracy: number
  matchedWords: number
  totalWords: number
  errors: RecitationError[]
  alignedText: {
    expected: string
    actual: string
    alignment: ('match' | 'substitution' | 'insertion' | 'deletion')[]
  }
}

export interface QariProfile {
  id: string
  name: string
  description: string
  style: 'murattal' | 'mujawwad' | 'hafs' | 'warsh'
  language: string
  popularity: number
  audioSamples: string[]
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// Component Props types
export interface QuranDisplayProps {
  verses: QuranVerse[]
  currentVerse?: string
  highlightedWords?: string[]
  tajweedEnabled: boolean
  fontSize: string
  onWordClick?: (wordId: string) => void
  onVerseComplete?: (verseId: string) => void
}

export interface AudioRecorderProps {
  onRecordingStart: () => void
  onRecordingStop: (audioBlob: Blob) => void
  onRecordingError: (error: string) => void
  maxDuration?: number
  audioConstraints?: MediaTrackConstraints
}

export interface FeedbackPanelProps {
  session: RecitationSession
  onRetry: () => void
  onNext: () => void
  onPlayCorrection: (errorId: string) => void
}

// Store types (Zustand)
export interface AppStore {
  // User state
  user: User | null
  isAuthenticated: boolean
  
  // Recitation state
  currentVerse: QuranVerse | null
  currentSession: RecitationSession | null
  audioRecording: AudioRecordingState
  
  // UI state
  isLoading: boolean
  error: string | null
  toasts: Toast[]
  
  // Settings
  preferences: UserPreferences
  
  // Actions
  setUser: (user: User | null) => void
  setCurrentVerse: (verse: QuranVerse) => void
  startRecording: () => void
  stopRecording: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

// Hook return types
export interface UseAudioRecorderReturn {
  isRecording: boolean
  isSupported: boolean
  duration: number
  volume: number
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob>
  pauseRecording: () => void
  resumeRecording: () => void
}

export interface UseSpeechToTextReturn {
  isProcessing: boolean
  result: SpeechToTextResult | null
  error: string | null
  processAudio: (audioBlob: Blob) => Promise<SpeechToTextResult>
}

export interface UseQuranComparisonReturn {
  isComparing: boolean
  result: ComparisonResult | null
  error: string | null
  compareTexts: (expected: string, actual: string) => Promise<ComparisonResult>
}

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  audio: {
    sampleRate: number
    channels: number
    maxDuration: number
    format: string
  }
  speechToText: {
    provider: 'openai' | 'google' | 'azure'
    language: string
    model: string
  }
  features: {
    realTimeFeedback: boolean
    offlineMode: boolean
    analytics: boolean
  }
}