import { useState, useRef, useCallback, useEffect } from 'react'
import RecordRTC from 'recordrtc'
import { UseAudioRecorderReturn } from '@/types'
import { checkMicrophonePermission } from '@/lib/utils'

interface UseAudioRecorderOptions {
  maxDuration?: number // in seconds
  onStart?: () => void
  onStop?: (blob: Blob) => void
  onError?: (error: string) => void
  onVolumeChange?: (volume: number) => void
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const {
    maxDuration = 300, // 5 minutes default
    onStart,
    onStop,
    onError,
    onVolumeChange
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<RecordRTC | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check browser support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const hasPermission = await checkMicrophonePermission()
        setIsSupported(hasPermission)
        if (!hasPermission) {
          setError('Microphone access denied or not supported')
        }
      } catch (err) {
        setError('Failed to check microphone support')
        setIsSupported(false)
      }
    }

    checkSupport()
  }, [])

  // Volume monitoring setup
  const setupVolumeMonitoring = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      const updateVolume = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray)
          
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          
          const average = sum / dataArray.length
          const volumeLevel = Math.round((average / 255) * 100)
          
          setVolume(volumeLevel)
          onVolumeChange?.(volumeLevel)
        }
      }
      
      volumeIntervalRef.current = setInterval(updateVolume, 100)
    } catch (err) {
      console.warn('Volume monitoring setup failed:', err)
    }
  }, [isRecording, onVolumeChange])

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      
      if (!isSupported) {
        throw new Error('Audio recording not supported')
      }

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000, // Optimal for speech recognition
        }
      })

      streamRef.current = stream

      // Setup RecordRTC
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        timeSlice: 1000, // 1 second chunks for real-time processing
        ondataavailable: (blob: Blob) => {
          // Could be used for real-time processing
          console.log('Audio chunk available:', blob.size)
        }
      })

      recorderRef.current.startRecording()
      setIsRecording(true)
      setDuration(0)
      
      // Setup volume monitoring
      setupVolumeMonitoring(stream)

      // Duration tracking
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          
          return newDuration
        })
      }, 1000)

      onStart?.()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('Recording start failed:', err)
    }
  }, [isSupported, maxDuration, onStart, onError, setupVolumeMonitoring])

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        if (!recorderRef.current || !isRecording) {
          throw new Error('No active recording to stop')
        }

        recorderRef.current.stopRecording(() => {
          try {
            const blob = recorderRef.current!.getBlob()
            
            // Cleanup
            setIsRecording(false)
            setVolume(0)
            
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            
            if (volumeIntervalRef.current) {
              clearInterval(volumeIntervalRef.current)
              volumeIntervalRef.current = null
            }
            
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop())
              streamRef.current = null
            }
            
            if (audioContextRef.current) {
              audioContextRef.current.close()
              audioContextRef.current = null
            }
            
            recorderRef.current = null
            
            onStop?.(blob)
            resolve(blob)
            
          } catch (err) {
            const errorMessage = 'Failed to process recording'
            setError(errorMessage)
            onError?.(errorMessage)
            reject(new Error(errorMessage))
          }
        })
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording'
        setError(errorMessage)
        onError?.(errorMessage)
        reject(new Error(errorMessage))
      }
    })
  }, [isRecording, onStop, onError])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.pauseRecording()
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current)
        volumeIntervalRef.current = null
      }
    }
  }, [isRecording])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.resumeRecording()
      
      // Resume duration tracking
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          return newDuration
        })
      }, 1000)
      
      // Resume volume monitoring
      if (streamRef.current) {
        setupVolumeMonitoring(streamRef.current)
      }
    }
  }, [isRecording, maxDuration, setupVolumeMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording().catch(console.error)
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current)
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isRecording, stopRecording])

  return {
    isRecording,
    isSupported,
    duration,
    volume,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  }
}