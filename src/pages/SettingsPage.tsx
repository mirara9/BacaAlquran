import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Settings page - Coming soon!</p>
          <Button className="mt-4">Back to Home</Button>
        </CardContent>
      </Card>
    </div>
  )
}