import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { 
  AppStore, 
  User, 
  QuranVerse, 
  RecitationSession, 
  UserPreferences, 
  AudioRecordingState,
  Toast
} from '@/types'
import { generateId } from '@/lib/utils'

const defaultPreferences: UserPreferences = {
  qariVoice: 'abdul_basit',
  playbackSpeed: 1.0,
  autoCorrection: true,
  tajweedHighlighting: true,
  feedbackLevel: 'detailed',
  arabicFontSize: 'medium',
  theme: 'light',
  language: 'en'
}

const defaultAudioState: AudioRecordingState = {
  isRecording: false,
  isProcessing: false,
  duration: 0,
  volume: 0,
  error: undefined
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // User state
        user: null,
        isAuthenticated: false,
        
        // Recitation state
        currentVerse: null,
        currentSession: null,
        audioRecording: defaultAudioState,
        
        // UI state
        isLoading: false,
        error: null,
        toasts: [],
        
        // Settings
        preferences: defaultPreferences,
        
        // Actions
        setUser: (user: User | null) => {
          set({ 
            user, 
            isAuthenticated: !!user 
          }, false, 'setUser')
        },
        
        setCurrentVerse: (verse: QuranVerse) => {
          set({ currentVerse: verse }, false, 'setCurrentVerse')
        },
        
        startRecording: () => {
          set(state => ({
            audioRecording: {
              ...state.audioRecording,
              isRecording: true,
              duration: 0,
              error: undefined
            }
          }), false, 'startRecording')
        },
        
        stopRecording: () => {
          set(state => ({
            audioRecording: {
              ...state.audioRecording,
              isRecording: false,
              isProcessing: true
            }
          }), false, 'stopRecording')
        },
        
        addToast: (toast: Omit<Toast, 'id'>) => {
          const newToast: Toast = {
            ...toast,
            id: generateId()
          }
          
          set(state => ({
            toasts: [...state.toasts, newToast]
          }), false, 'addToast')
          
          // Auto-remove toast after duration
          if (toast.duration !== 0) {
            setTimeout(() => {
              get().removeToast(newToast.id)
            }, toast.duration || 5000)
          }
        },
        
        removeToast: (id: string) => {
          set(state => ({
            toasts: state.toasts.filter(toast => toast.id !== id)
          }), false, 'removeToast')
        },
        
        updatePreferences: (newPreferences: Partial<UserPreferences>) => {
          set(state => ({
            preferences: {
              ...state.preferences,
              ...newPreferences
            }
          }), false, 'updatePreferences')
        },
        
        // Additional actions for complex state management
        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, 'setLoading')
        },
        
        setError: (error: string | null) => {
          set({ error }, false, 'setError')
        },
        
        createSession: (verseId: string) => {
          const { user } = get()
          if (!user) return
          
          const session: RecitationSession = {
            id: generateId(),
            userId: user.id,
            verseId,
            startTime: new Date(),
            errors: [],
            status: 'recording'
          }
          
          set({ currentSession: session }, false, 'createSession')
        },
        
        updateSession: (updates: Partial<RecitationSession>) => {
          set(state => ({
            currentSession: state.currentSession ? {
              ...state.currentSession,
              ...updates
            } : null
          }), false, 'updateSession')
        },
        
        completeSession: () => {
          set(state => ({
            currentSession: state.currentSession ? {
              ...state.currentSession,
              endTime: new Date(),
              status: 'completed' as const
            } : null
          }), false, 'completeSession')
        },
        
        updateAudioRecording: (updates: Partial<AudioRecordingState>) => {
          set(state => ({
            audioRecording: {
              ...state.audioRecording,
              ...updates
            }
          }), false, 'updateAudioRecording')
        },
        
        resetAudioRecording: () => {
          set({ audioRecording: defaultAudioState }, false, 'resetAudioRecording')
        },
        
        // Utility actions
        clearError: () => {
          set({ error: null }, false, 'clearError')
        },
        
        clearToasts: () => {
          set({ toasts: [] }, false, 'clearToasts')
        },
        
        reset: () => {
          set({
            currentVerse: null,
            currentSession: null,
            audioRecording: defaultAudioState,
            isLoading: false,
            error: null,
            toasts: []
          }, false, 'reset')
        }
      }),
      {
        name: 'quran-app-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          preferences: state.preferences
        })
      }
    ),
    {
      name: 'quran-app-store'
    }
  )
)

// Selector hooks for better performance
export const useUser = () => useAppStore(state => state.user)
export const useIsAuthenticated = () => useAppStore(state => state.isAuthenticated)
export const useCurrentVerse = () => useAppStore(state => state.currentVerse)
export const useCurrentSession = () => useAppStore(state => state.currentSession)
export const useAudioRecording = () => useAppStore(state => state.audioRecording)
export const usePreferences = () => useAppStore(state => state.preferences)
export const useToasts = () => useAppStore(state => state.toasts)
export const useIsLoading = () => useAppStore(state => state.isLoading)
export const useError = () => useAppStore(state => state.error)

// Action hooks
export const useAppActions = () => useAppStore(state => ({
  setUser: state.setUser,
  setCurrentVerse: state.setCurrentVerse,
  startRecording: state.startRecording,
  stopRecording: state.stopRecording,
  addToast: state.addToast,
  removeToast: state.removeToast,
  updatePreferences: state.updatePreferences,
  setLoading: state.setLoading,
  setError: state.setError,
  createSession: state.createSession,
  updateSession: state.updateSession,
  completeSession: state.completeSession,
  updateAudioRecording: state.updateAudioRecording,
  resetAudioRecording: state.resetAudioRecording,
  clearError: state.clearError,
  clearToasts: state.clearToasts,
  reset: state.reset
}))

// Computed selectors
export const useIsRecording = () => useAppStore(state => state.audioRecording.isRecording)
export const useIsProcessing = () => useAppStore(state => state.audioRecording.isProcessing)
export const useHasActiveSession = () => useAppStore(state => !!state.currentSession)
export const useCanRecord = () => useAppStore(state => 
  !!state.currentVerse && !state.audioRecording.isRecording && !state.audioRecording.isProcessing
)