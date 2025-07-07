# Quran Recitation App - Setup Guide

## Cross-Platform Installation

This guide will help you set up the Quran Recitation app on Windows, Linux, or macOS.

### Prerequisites

1. **Node.js 18 or higher**
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm (comes with Node.js)**
   - Verify installation: `npm --version`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd quran-reader-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to: `http://localhost:3000`

### Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

### Troubleshooting

#### Windows-specific issues:
- If you get permission errors, run cmd/PowerShell as Administrator
- Make sure Windows Defender isn't blocking the development server

#### Linux-specific issues:
- Install build essentials: `sudo apt-get install build-essential`
- For Ubuntu/Debian: `sudo apt-get install nodejs npm`

#### macOS-specific issues:
- Install Xcode command line tools: `xcode-select --install`
- Consider using Homebrew: `brew install node`

#### Common Issues:

1. **Port 3000 already in use**
   ```bash
   npm run dev -- --port 3001
   ```

2. **CSS compilation errors**
   - Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **TypeScript errors**
   ```bash
   npm run type-check
   ```

4. **Linting errors**
   ```bash
   npm run lint
   ```

### Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Browser Support

- **Chrome 88+** (Recommended)
- **Firefox 85+**
- **Safari 14+**
- **Edge 88+**

### Required Permissions

The app requires **microphone access** for audio recording. Make sure to:
1. Allow microphone access when prompted
2. Use HTTPS in production (required for microphone access)
3. Ensure your browser supports the Web Audio API

### Environment Configuration

Create a `.env` file for optional API keys:

```env
# Optional: OpenAI API for better speech recognition
VITE_OPENAI_API_KEY=your_key_here

# Optional: Google Speech API
VITE_GOOGLE_SPEECH_API_KEY=your_key_here
```

### Deployment Options

1. **Vercel** (Recommended)
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Netlify**
   - Drag and drop the `dist` folder after running `npm run build`

3. **GitHub Pages**
   - Set up GitHub Actions for automatic deployment

### Support

If you encounter issues:
1. Check the browser console for errors
2. Ensure your browser supports required APIs
3. Verify Node.js and npm versions
4. Try clearing browser cache and cookies

### Performance Tips

- Use Chrome or Edge for best performance
- Ensure stable internet connection for speech recognition
- Close unnecessary browser tabs during recording
- Use a good quality microphone for better accuracy