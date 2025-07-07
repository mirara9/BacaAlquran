# Quran Recitation Learning App

A modern web application that assists users in learning and improving their Quran recitation through real-time voice detection, text comparison, and AI-powered feedback.

## 🌟 Features

### Core Functionality
- **Real-time Audio Recording** - High-quality audio capture optimized for speech recognition
- **AI-Powered Speech Recognition** - Advanced speech-to-text specifically tuned for Quranic Arabic
- **Interactive Quran Display** - Beautiful, responsive Arabic text with Tajweed highlighting
- **Real-time Feedback** - Instant pronunciation feedback with word-level accuracy
- **Progress Tracking** - Comprehensive analytics and learning progress monitoring

### Modern UI/UX
- **Islamic Design** - Respectful design using traditional Islamic aesthetics
- **Responsive Layout** - Optimized for desktop, tablet, and mobile devices
- **Accessibility** - Screen reader support and keyboard navigation
- **Dark/Light Modes** - Theme support for different preferences
- **RTL Support** - Proper right-to-left layout for Arabic text

### Technical Features
- **Progressive Web App (PWA)** - Offline support and app-like experience
- **Real-time Processing** - Low-latency feedback for seamless learning
- **Multiple Qaris** - Choose from different recitation styles and voices
- **Audio Waveform Visualization** - Visual feedback during recording
- **Error Correction** - Detailed feedback with pronunciation guides

## 🚀 Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Zustand** - Lightweight state management
- **React Query** - Server state management and caching

### Audio Processing
- **Web Audio API** - Native browser audio processing
- **RecordRTC** - Advanced audio recording capabilities
- **WaveSurfer.js** - Audio waveform visualization
- **Speech Recognition API** - Browser-native speech recognition

### UI Components
- **Radix UI** - Accessible, unstyled UI primitives
- **Lucide React** - Beautiful SVG icons
- **Class Variance Authority** - Type-safe component variants
- **Tailwind Merge** - Intelligent class merging

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Modern browser with microphone support

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd quran-reader-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
Create a `.env` file in the root directory:

```env
# Speech-to-Text API Keys (optional)
VITE_OPENAI_API_KEY=your_openai_key_here
VITE_GOOGLE_SPEECH_API_KEY=your_google_key_here
VITE_AZURE_SPEECH_KEY=your_azure_key_here

# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_ENV=development
```

## 🎯 Usage

### Basic Workflow
1. **Select a Verse** - Choose from the available Quran verses
2. **Listen to Reference** - Play the correct pronunciation if available
3. **Start Recording** - Click the record button and recite clearly
4. **Review Feedback** - Get instant feedback on your pronunciation
5. **Practice Again** - Repeat until you achieve the desired accuracy

### Advanced Features
- **Tajweed Highlighting** - Enable color-coded Tajweed rules
- **Custom Font Sizes** - Adjust Arabic text size for better readability
- **Multiple Qaris** - Choose different recitation styles
- **Progress Analytics** - Track your improvement over time
- **Offline Practice** - Continue learning without internet connection

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Card, etc.)
│   ├── audio/          # Audio-related components
│   ├── quran/          # Quran display components
│   └── forms/          # Form components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── audio/          # Audio processing utilities
│   ├── quran/          # Quran text processing
│   ├── api/            # API clients
│   └── utils/          # General utilities
├── pages/              # Page components
├── stores/             # State management (Zustand)
├── styles/             # Global styles and themes
└── types/              # TypeScript type definitions
```

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run test         # Run tests
npm run test:e2e     # Run end-to-end tests
```

### Code Quality
- **ESLint** - Code linting with React and TypeScript rules
- **Prettier** - Code formatting (configured via ESLint)
- **TypeScript** - Static type checking
- **Husky** - Git hooks for pre-commit checks

### Testing
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **Testing Library** - React component testing utilities

## 🌐 Browser Support

### Minimum Requirements
- **Chrome 88+** - Full feature support
- **Firefox 85+** - Full feature support
- **Safari 14+** - Limited Web Audio API support
- **Edge 88+** - Full feature support

### Required APIs
- **MediaDevices API** - Audio recording
- **Web Audio API** - Audio processing
- **Speech Recognition API** - Voice recognition (optional)
- **Local Storage** - Settings persistence

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Netlify
```bash
# Build and deploy
npm run build
# Upload dist/ folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔐 Security & Privacy

### Data Protection
- **No Server Storage** - Audio recordings processed locally when possible
- **Encrypted Transmission** - All API calls use HTTPS
- **User Consent** - Clear permissions for microphone access
- **Data Minimization** - Only collect necessary data for functionality

### Privacy Features
- **Optional Cloud Processing** - Choose between local and cloud speech recognition
- **Auto-Delete** - Recordings automatically deleted after processing
- **Anonymous Analytics** - No personally identifiable information collected
- **GDPR Compliant** - Right to deletion and data portability

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Contribution Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass
- Use conventional commit messages

## 📋 Roadmap

### Phase 1: Core Features ✅
- [x] Basic audio recording
- [x] Speech-to-text integration
- [x] Quran text display
- [x] Real-time feedback
- [x] Modern UI/UX

### Phase 2: Enhanced Learning
- [ ] Advanced Tajweed analysis
- [ ] Multiple Qari voices
- [ ] Progress analytics dashboard
- [ ] Achievement system
- [ ] Social features

### Phase 3: Advanced Features
- [ ] AI-powered personalized learning
- [ ] Group recitation sessions
- [ ] Teacher dashboard
- [ ] Mobile app (React Native)
- [ ] Advanced analytics

### Phase 4: Enterprise
- [ ] Mosque management integration
- [ ] Curriculum management
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] API for third-party integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Islamic Community** - For guidance on proper Quran recitation practices
- **Open Source Libraries** - All the amazing tools that made this possible
- **Beta Testers** - Community members who provided valuable feedback
- **Audio Contributors** - Qaris who provided reference recordings

## 📞 Support

### Getting Help
- **Documentation** - Check this README and inline code comments
- **Issues** - Report bugs and request features on GitHub
- **Discussions** - Community support and questions
- **Email** - Direct support for urgent issues

### Community
- **Discord** - Join our community server for real-time chat
- **Reddit** - Follow r/QuranLearning for updates and discussions
- **Twitter** - Follow @QuranReciteApp for announcements

---

**Built with ❤️ for the global Muslim community**

*"And recite the Quran with measured recitation." - Quran 73:4*