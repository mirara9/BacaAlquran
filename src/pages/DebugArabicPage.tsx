import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cleanArabicText, calculateSimilarity } from '@/lib/utils'

export default function DebugArabicPage() {
  const [spoken] = useState('بسم الله الرحمن الرحيم')
  const [expected] = useState('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ')
  
  const normalizedSpoken = cleanArabicText(spoken)
  const normalizedExpected = cleanArabicText(expected)
  const similarity = calculateSimilarity(normalizedSpoken, normalizedExpected)
  
  // Character-by-character analysis
  const spokenChars = normalizedSpoken.split('')
  const expectedChars = normalizedExpected.split('')
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Arabic Text Normalization Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2">Original Texts:</h3>
            <div className="bg-gray-100 p-3 rounded" dir="rtl">
              <p className="mb-2">
                <span className="font-bold">Spoken:</span> <span className="text-xl">{spoken}</span>
              </p>
              <p>
                <span className="font-bold">Expected:</span> <span className="text-xl">{expected}</span>
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-2">After Normalization:</h3>
            <div className="bg-gray-100 p-3 rounded" dir="rtl">
              <p className="mb-2">
                <span className="font-bold">Spoken:</span> <span className="text-xl">{normalizedSpoken}</span>
              </p>
              <p>
                <span className="font-bold">Expected:</span> <span className="text-xl">{normalizedExpected}</span>
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-2">Character Analysis:</h3>
            <div className="bg-gray-100 p-3 rounded overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2">Position</th>
                    <th className="text-center p-2">Spoken Char</th>
                    <th className="text-center p-2">Unicode</th>
                    <th className="text-center p-2">Expected Char</th>
                    <th className="text-center p-2">Unicode</th>
                    <th className="text-center p-2">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {Math.max(spokenChars.length, expectedChars.length) > 0 && 
                    Array.from({ length: Math.max(spokenChars.length, expectedChars.length) }).map((_, i) => (
                      <tr key={i} className={spokenChars[i] === expectedChars[i] ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="p-2">{i}</td>
                        <td className="text-center p-2 text-xl" dir="rtl">{spokenChars[i] || '-'}</td>
                        <td className="text-center p-2 font-mono">{spokenChars[i] ? spokenChars[i].charCodeAt(0) : '-'}</td>
                        <td className="text-center p-2 text-xl" dir="rtl">{expectedChars[i] || '-'}</td>
                        <td className="text-center p-2 font-mono">{expectedChars[i] ? expectedChars[i].charCodeAt(0) : '-'}</td>
                        <td className="text-center p-2">
                          {spokenChars[i] === expectedChars[i] ? '✅' : '❌'}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-2">Results:</h3>
            <div className="bg-gray-100 p-3 rounded">
              <p className="mb-2">
                <span className="font-bold">Match:</span> {normalizedSpoken === normalizedExpected ? '✅ YES' : '❌ NO'}
              </p>
              <p className="mb-2">
                <span className="font-bold">Similarity:</span> {similarity}%
              </p>
              <p className="mb-2">
                <span className="font-bold">Spoken Length:</span> {normalizedSpoken.length} characters
              </p>
              <p>
                <span className="font-bold">Expected Length:</span> {normalizedExpected.length} characters
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}