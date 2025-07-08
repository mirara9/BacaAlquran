import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SurahSelector } from '@/components/recitation/SurahSelector'
import { WordByWordReciter } from '@/components/recitation/WordByWordReciter'

export default function NewRecitationPage() {
  const navigate = useNavigate()
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)

  const handleSurahSelect = (surahId: number) => {
    setSelectedSurah(surahId)
  }

  const handleBackToSelection = () => {
    setSelectedSurah(null)
  }

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
                onClick={() => {
                  if (selectedSurah) {
                    handleBackToSelection()
                  } else {
                    navigate('/')
                  }
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {selectedSurah ? 'Back to Surah Selection' : 'Back to Home'}
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {selectedSurah ? 'Al-Fatiha - Word by Word' : 'Quran Recitation'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/diagnostics')}
              >
                Microphone Test
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
        {selectedSurah ? (
          <WordByWordReciter />
        ) : (
          <SurahSelector onSurahSelect={handleSurahSelect} />
        )}
      </div>
    </div>
  )
}