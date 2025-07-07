import { useState, useRef, useCallback, useEffect } from 'react'

interface UseAudioPlayerOptions {
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onError?: (error: string) => void
  onLoadStart?: () => void
  onCanPlay?: () => void
}

interface UseAudioPlayerReturn {
  isPlaying: boolean
  isLoading: boolean
  duration: number
  currentTime: number
  volume: number
  error: string | null
  play: (url?: string) => Promise<void>
  pause: () => void
  stop: () => void
  setVolume: (volume: number) => void
  seek: (time: number) => void
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
  const {
    onPlay,
    onPause,
    onEnded,
    onError,
    onLoadStart,
    onCanPlay
  } = options

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolumeState] = useState(1.0)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update current time
  const updateTime = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [])

  // Start time tracking
  const startTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(updateTime, 100)
  }, [updateTime])

  // Stop time tracking
  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Play audio
  const play = useCallback(async (url?: string): Promise<void> => {
    try {
      setError(null)
      setIsLoading(true)

      // If URL provided, create new audio element
      if (url) {
        if (audioRef.current) {
          audioRef.current.pause()
        }

        const audio = new Audio()
        
        // Set up event listeners
        audio.addEventListener('loadstart', () => {
          setIsLoading(true)
          onLoadStart?.()
        })

        audio.addEventListener('canplay', () => {
          setIsLoading(false)
          onCanPlay?.()
        })

        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration)
        })

        audio.addEventListener('play', () => {
          setIsPlaying(true)
          startTimeTracking()
          onPlay?.()
        })

        audio.addEventListener('pause', () => {
          setIsPlaying(false)
          stopTimeTracking()
          onPause?.()
        })

        audio.addEventListener('ended', () => {
          setIsPlaying(false)
          setCurrentTime(0)
          stopTimeTracking()
          onEnded?.()
        })

        audio.addEventListener('error', () => {
          const errorMsg = 'Failed to load audio file'
          setError(errorMsg)
          setIsLoading(false)
          setIsPlaying(false)
          onError?.(errorMsg)
        })

        audio.addEventListener('timeupdate', updateTime)

        audioRef.current = audio
        audio.src = url
        audio.volume = volume
      }

      if (audioRef.current) {
        await audioRef.current.play()
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to play audio'
      setError(errorMsg)
      setIsLoading(false)
      setIsPlaying(false)
      onError?.(errorMsg)
    }
  }, [volume, onPlay, onPause, onEnded, onError, onLoadStart, onCanPlay, startTimeTracking, stopTimeTracking, updateTime])

  // Pause audio
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  // Stop audio
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setCurrentTime(0)
    }
    setIsPlaying(false)
    stopTimeTracking()
  }, [stopTimeTracking])

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume
    }
  }, [])

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, time))
    }
  }, [duration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [stopTimeTracking])

  return {
    isPlaying,
    isLoading,
    duration,
    currentTime,
    volume,
    error,
    play,
    pause,
    stop,
    setVolume,
    seek
  }
}

// Text-to-Speech fallback for Arabic pronunciation
export function useTextToSpeech() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    setIsSupported('speechSynthesis' in window)
  }, [])

  const speak = useCallback((text: string, lang: string = 'ar-SA') => {
    if (!isSupported) {
      console.warn('Text-to-speech not supported')
      return Promise.reject(new Error('Text-to-speech not supported'))
    }

    return new Promise<void>((resolve, reject) => {
      // Cancel any ongoing speech
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.8 // Slower for better pronunciation
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (event) => {
        setIsSpeaking(false)
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      // Try to find Arabic voice
      const voices = speechSynthesis.getVoices()
      const arabicVoice = voices.find(voice => 
        voice.lang.startsWith('ar') || 
        voice.name.toLowerCase().includes('arabic')
      )
      
      if (arabicVoice) {
        utterance.voice = arabicVoice
      }

      speechSynthesis.speak(utterance)
    })
  }, [isSupported])

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    isSupported,
    isSpeaking,
    speak,
    stop
  }
}