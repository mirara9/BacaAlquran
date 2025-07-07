import { useState, useEffect } from 'react'
import { Mic, MicOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function MicrophoneTest() {
  const [tests, setTests] = useState({
    https: false,
    mediaDevices: false,
    speechRecognition: false,
    microphonePermission: false,
    microphoneAccess: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError(null)
    const results = { ...tests }

    try {
      // Test 1: HTTPS/Secure Context
      results.https = window.isSecureContext || 
        window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'

      // Test 2: MediaDevices API
      results.mediaDevices = !!navigator.mediaDevices?.getUserMedia

      // Test 3: Speech Recognition API
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      results.speechRecognition = !!SpeechRecognition

      // Test 4: Microphone Permission
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          results.microphonePermission = permission.state === 'granted'
        } catch (err) {
          console.log('Permission query not supported:', err)
        }
      }

      // Test 5: Actual Microphone Access
      if (results.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          results.microphoneAccess = true
          stream.getTracks().forEach(track => track.stop())
        } catch (err) {
          console.log('Microphone access failed:', err)
          results.microphoneAccess = false
          if (err instanceof Error) {
            setError(err.message)
          }
        }
      }

      setTests(results)
    } catch (err) {
      console.error('Diagnostic error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const TestItem = ({ label, passed, description }: { label: string; passed: boolean; description: string }) => (
    <div className="flex items-center space-x-3 p-2 rounded border">
      {passed ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600" />
      )}
      <div className="flex-1">
        <p className={`font-medium ${passed ? 'text-green-800' : 'text-red-800'}`}>
          {label}
        </p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )

  const allTestsPassed = Object.values(tests).every(Boolean)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {allTestsPassed && !isLoading ? (
            <Mic className="h-5 w-5 text-green-600" />
          ) : (
            <MicOff className="h-5 w-5 text-red-600" />
          )}
          <span>Microphone Diagnostics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-center text-gray-600">Running diagnostics...</p>
        ) : (
          <>
            <TestItem
              label="Secure Context"
              passed={tests.https}
              description="HTTPS or localhost required for microphone access"
            />
            <TestItem
              label="MediaDevices API"
              passed={tests.mediaDevices}
              description="Browser supports getUserMedia for microphone access"
            />
            <TestItem
              label="Speech Recognition"
              passed={tests.speechRecognition}
              description="Browser supports Web Speech API"
            />
            <TestItem
              label="Microphone Permission"
              passed={tests.microphonePermission}
              description="Permission to access microphone"
            />
            <TestItem
              label="Microphone Access"
              passed={tests.microphoneAccess}
              description="Can successfully access microphone device"
            />

            {error && (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-red-800 font-medium">Error Details:</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {allTestsPassed ? (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-green-800 font-medium">✅ All tests passed!</p>
                <p className="text-green-600 text-sm">Speech recognition should work properly.</p>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-yellow-800 font-medium">⚠️ Some tests failed</p>
                <p className="text-yellow-600 text-sm">
                  Please resolve the failed tests above for speech recognition to work.
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                className="flex-1"
              >
                Run Tests Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Refresh Page
              </Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Browser Info:</strong> {navigator.userAgent}</p>
              <p><strong>Location:</strong> {window.location.href}</p>
              <p><strong>Secure Context:</strong> {window.isSecureContext ? 'Yes' : 'No'}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}