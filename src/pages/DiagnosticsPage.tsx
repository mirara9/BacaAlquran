import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MicrophoneTest } from '@/components/debug/MicrophoneTest'

export default function DiagnosticsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-green-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-green-700" />
                <span className="font-medium text-gray-900">Microphone Diagnostics</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Microphone & Speech Recognition Diagnostics
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Use this page to troubleshoot microphone and speech recognition issues. 
              The tests below will help identify any problems with your setup.
            </p>
          </div>

          <MicrophoneTest />

          <div className="mt-8 text-center">
            <Button
              onClick={() => navigate('/recitation')}
              className="px-8 py-3"
            >
              Go to Recitation Practice
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}