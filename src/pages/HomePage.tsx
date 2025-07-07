import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Mic, TrendingUp, Settings, Users, Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const features = [
  {
    icon: Mic,
    title: 'Voice Recognition',
    description: 'Advanced AI-powered speech recognition specifically trained for Quranic Arabic pronunciation'
  },
  {
    icon: BookOpen,
    title: 'Interactive Quran',
    description: 'Beautiful, responsive Quran display with Tajweed highlighting and word-by-word guidance'
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Detailed analytics and progress tracking to monitor your recitation improvement over time'
  },
  {
    icon: Award,
    title: 'Personalized Feedback',
    description: 'Real-time pronunciation feedback with corrections and suggestions from qualified teachers'
  },
  {
    icon: Users,
    title: 'Community Learning',
    description: 'Learn with others through group sessions and collaborative recitation practices'
  },
  {
    icon: Settings,
    title: 'Customizable Experience',
    description: 'Personalize your learning with multiple Qaris, speeds, and difficulty levels'
  }
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="relative z-20 bg-white/80 backdrop-blur-md border-b border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-green-700">QuranRecite</span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button variant="ghost" onClick={() => navigate('/settings')}>
                Settings
              </Button>
              <Button onClick={() => navigate('/recitation')}>
                Start Learning
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6"
            >
              Perfect Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600">
                Quran Recitation
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Learn to recite the Holy Quran with proper pronunciation using AI-powered 
              speech recognition and personalized feedback from qualified teachers.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="xl"
                className="text-lg px-8 py-4"
                onClick={() => navigate('/recitation')}
              >
                <Mic className="mr-2 h-5 w-5" />
                Start Reciting Now
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="text-lg px-8 py-4"
                onClick={() => navigate('/dashboard')}
              >
                View Dashboard
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-1/2 left-4 w-72 h-72 bg-green-200 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-4 w-96 h-96 bg-teal-200 rounded-full blur-3xl opacity-30" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Why Choose QuranRecite?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Experience the most advanced Quran learning platform with cutting-edge technology 
              and traditional Islamic teaching methods.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-green-700" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-700 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-white mb-6"
          >
            Begin Your Recitation Journey Today
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
          >
            Join thousands of learners who have improved their Quran recitation 
            with our AI-powered platform. Start your journey to perfect pronunciation today.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button
              size="xl"
              variant="secondary"
              className="text-lg px-8 py-4 bg-white text-green-700 hover:bg-gray-50"
              onClick={() => navigate('/recitation')}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Start Learning Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">QuranRecite</span>
            </div>
            <p className="text-gray-400 mb-6">
              Enhancing Quran recitation through technology and tradition
            </p>
            <div className="flex justify-center space-x-6">
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                Privacy Policy
              </Button>
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                Terms of Service
              </Button>
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                Contact Us
              </Button>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800 text-gray-400">
              <p>&copy; 2024 QuranRecite. Built with ❤️ for the Ummah.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}