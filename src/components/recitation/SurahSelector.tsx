import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BookOpen, ChevronRight } from 'lucide-react'

interface Surah {
  id: number
  name: string
  arabicName: string
  verses: number
  revelation: 'Meccan' | 'Medinan'
}

const AVAILABLE_SURAHS: Surah[] = [
  {
    id: 1,
    name: 'Al-Fatiha',
    arabicName: 'الفاتحة',
    verses: 7,
    revelation: 'Meccan'
  }
  // We can add more surahs later
]

interface SurahSelectorProps {
  onSurahSelect: (surahId: number) => void
}

export function SurahSelector({ onSurahSelect }: SurahSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-green-800 mb-4">
          Quran Recitation Practice
        </h1>
        <p className="text-gray-600 text-lg">
          Select a Surah to begin your recitation practice
        </p>
      </div>

      <div className="grid gap-4">
        {AVAILABLE_SURAHS.map((surah) => (
          <Card 
            key={surah.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-green-200 hover:border-green-400"
            onClick={() => onSurahSelect(surah.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-700 text-white rounded-full flex items-center justify-center text-lg font-bold">
                    {surah.id}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {surah.name}
                    </h3>
                    <p className="text-2xl text-green-700 uthmani-font" dir="rtl">
                      {surah.arabicName}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {surah.verses} verses
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                    {surah.revelation}
                  </span>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSurahSelect(surah.id)
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Practice
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              How It Works
            </h3>
            <div className="text-left text-blue-700 space-y-2">
              <p>• Select a Surah to practice</p>
              <p>• Read the verses aloud clearly</p>
              <p>• <span className="bg-green-200 px-1 rounded">Green highlighting</span> shows correct recitation</p>
              <p>• <span className="bg-red-200 px-1 rounded">Red highlighting</span> shows parts that need practice</p>
              <p>• The app automatically detects which verse you're reading</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}