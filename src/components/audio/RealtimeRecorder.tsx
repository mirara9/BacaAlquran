import { } from 'react'
import { Mic, MicOff, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface RealtimeRecorderProps {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  confidence: number
  error: string | null
  onStartListening: () => void
  onStopListening: () => void
  className?: string
  disabled?: boolean
}

export function RealtimeRecorder({
  isListening,
  isSupported,
  transcript,
  interimTranscript,
  confidence,
  error,
  onStartListening,
  onStopListening,
  className,
  disabled = false
}: RealtimeRecorderProps) {
  if (!isSupported) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 text-red-700">
            <MicOff className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-medium">Microphone Not Available</p>
              <p className="text-sm text-red-600 mb-3">
                {error || 'Please enable microphone access for speech recognition.'}
              </p>
              <div className="space-y-2 text-xs text-red-600">
                <p>• Ensure you have a microphone connected</p>
                <p>• Allow microphone permission when prompted</p>
                <p>• Use Chrome, Edge, or Safari for best compatibility</p>
                <p>• Make sure you're on localhost or HTTPS</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page & Try Again
          </Button>
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
            <div className="flex-1">
              <p className="font-medium">Microphone Access Error</p>
              <p className="text-sm text-red-600 mb-3">{error}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onStartListening}
              disabled={disabled}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-green-200 bg-green-50', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full',
              isListening 
                ? 'bg-red-100 text-red-600 animate-pulse' 
                : 'bg-gray-100 text-gray-600'
            )}>
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </div>
            <span className="text-lg font-semibold">
              {isListening ? 'Listening...' : 'Real-time Recognition'}
            </span>
          </div>
          {confidence > 0 && (
            <div className="text-sm text-gray-600">
              Confidence: {confidence}%
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recognition Status */}
        <div className="space-y-3">
          {/* Current Recognition */}
          {(transcript || interimTranscript) && (
            <div className="space-y-2">
              {transcript && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Recognized:</p>
                  <div className="bg-white p-3 rounded border rtl text-right">
                    <p className="arabic-text text-lg leading-relaxed">{transcript}</p>
                  </div>
                </div>
              )}
              
              {interimTranscript && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Currently hearing:</p>
                  <div className="bg-blue-50 p-3 rounded border rtl text-right">
                    <p className="arabic-text text-lg leading-relaxed text-blue-700 italic">
                      {interimTranscript}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!isListening && !transcript && (
            <div className="text-center py-4">
              <Volume2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                Click "Start Listening" and begin reciting the verse clearly.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Words will be highlighted in real-time as you speak.
              </p>
            </div>
          )}

          {isListening && !transcript && !interimTranscript && (
            <div className="text-center py-4">
              <div className="animate-pulse">
                <Mic className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-medium">
                  Listening for your recitation...
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Speak clearly into your microphone
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3 pt-4 border-t">
          {!isListening ? (
            <Button
              variant="islamic"
              size="lg"
              onClick={onStartListening}
              disabled={disabled}
              className="px-8"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Listening
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              onClick={onStopListening}
              className="px-8"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop Listening
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 p-3 rounded text-sm">
          <p className="font-medium text-blue-800 mb-1">💡 Tips for better recognition:</p>
          <ul className="text-blue-700 space-y-1">
            <li>• Speak clearly and at a moderate pace</li>
            <li>• Ensure you're in a quiet environment</li>
            <li>• Keep your microphone close but not too close</li>
            <li>• Allow microphone permissions when prompted</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}