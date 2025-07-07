import React, { useEffect } from 'react'
import { Mic, MicOff, Square, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Card, CardContent } from '@/components/ui/Card'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useAppActions, useIsRecording } from '@/stores/appStore'
import { formatDuration, cn } from '@/lib/utils'

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  maxDuration?: number
  className?: string
  disabled?: boolean
}

export function AudioRecorder({ 
  onRecordingComplete, 
  maxDuration = 300, 
  className,
  disabled = false
}: AudioRecorderProps) {
  const { addToast, updateAudioRecording } = useAppActions()
  const isRecordingFromStore = useIsRecording()

  const {
    isRecording,
    isSupported,
    duration,
    volume,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = useAudioRecorder({
    maxDuration,
    onStart: () => {
      updateAudioRecording({ isRecording: true, error: undefined })
      addToast({
        type: 'success',
        title: 'Recording started',
        description: 'Speak clearly into your microphone'
      })
    },
    onStop: (blob) => {
      updateAudioRecording({ isRecording: false, isProcessing: true })
      onRecordingComplete(blob)
      addToast({
        type: 'success',
        title: 'Recording completed',
        description: 'Processing your recitation...'
      })
    },
    onError: (errorMessage) => {
      updateAudioRecording({ error: errorMessage, isRecording: false })
      addToast({
        type: 'error',
        title: 'Recording failed',
        description: errorMessage
      })
    },
    onVolumeChange: (vol) => {
      updateAudioRecording({ volume: vol })
    }
  })

  // Sync duration with store
  useEffect(() => {
    updateAudioRecording({ duration })
  }, [duration, updateAudioRecording])

  const handleStartRecording = async () => {
    try {
      await startRecording()
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  const handleStopRecording = async () => {
    try {
      await stopRecording()
    } catch (err) {
      console.error('Failed to stop recording:', err)
    }
  }

  if (!isSupported) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 text-red-700">
            <MicOff className="h-5 w-5" />
            <div>
              <p className="font-medium">Microphone not supported</p>
              <p className="text-sm text-red-600">
                Please ensure you have a microphone connected and grant permission to use it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 text-red-700">
            <MicOff className="h-5 w-5" />
            <div>
              <p className="font-medium">Recording Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => updateAudioRecording({ error: undefined })}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-islamic-green/20 bg-islamic-cream/50', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Recording Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                isRecording 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600'
              )}>
                {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-medium">
                  {isRecording ? 'Recording...' : 'Ready to record'}
                </p>
                <p className="text-sm text-gray-600">
                  {isRecording 
                    ? `Duration: ${formatDuration(duration)}`
                    : 'Click to start your recitation'
                  }
                </p>
              </div>
            </div>
            
            {/* Duration Progress */}
            {isRecording && (
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-islamic-green">
                  {formatDuration(duration)}
                </p>
                <p className="text-xs text-gray-500">
                  Max: {formatDuration(maxDuration)}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isRecording && (
            <div className="space-y-2">
              <Progress 
                value={duration} 
                max={maxDuration} 
                variant="default"
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0:00</span>
                <span>{formatDuration(maxDuration)}</span>
              </div>
            </div>
          )}

          {/* Volume Indicator */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Volume:</span>
                <div className="flex-1">
                  <Progress 
                    value={volume} 
                    max={100} 
                    variant={volume > 80 ? 'warning' : volume > 20 ? 'success' : 'error'}
                    size="sm"
                  />
                </div>
                <span className="text-sm font-mono text-gray-600">{volume}%</span>
              </div>
              {volume < 10 && (
                <p className="text-xs text-yellow-600">
                  🔇 Volume is low. Please speak louder or check your microphone.
                </p>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center space-x-3">
            {!isRecording ? (
              <Button
                variant="islamic"
                size="lg"
                onClick={handleStartRecording}
                disabled={disabled}
                className="px-8"
              >
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={pauseRecording}
                  className="px-6"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStopRecording}
                  className="px-6"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isRecording 
                ? 'Recite the verse clearly. The app will automatically detect your pronunciation.'
                : 'Make sure you\'re in a quiet environment for best results.'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}