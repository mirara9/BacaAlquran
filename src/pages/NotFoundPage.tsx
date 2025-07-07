import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-islamic-green/10 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-islamic-green" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Page Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/recitation')}
              className="w-full"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Start Reciting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}