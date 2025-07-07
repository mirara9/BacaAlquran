import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Toaster } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('@/pages/HomePage'))
const RecitationPage = React.lazy(() => import('@/pages/RecitationPage'))
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'))
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-islamic-cream via-white to-islamic-cream/50">
        {/* Islamic Pattern Background */}
        <div className="fixed inset-0 islamic-pattern opacity-30 pointer-events-none" />
        
        {/* Main Content */}
        <div className="relative z-10">
          <Suspense 
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/recitation" element={<RecitationPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
        
        {/* Toast Notifications */}
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}

export default App