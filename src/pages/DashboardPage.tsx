import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Dashboard page - Coming soon!</p>
          <Button className="mt-4">Back to Home</Button>
        </CardContent>
      </Card>
    </div>
  )
}