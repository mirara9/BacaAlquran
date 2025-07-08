import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface SpeechRecognitionFallbackProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
}

export const SpeechRecognitionFallback: React.FC<SpeechRecognitionFallbackProps> = ({
  onTranscript,
  onError,
  language = 'ar-SA',
  continuous = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const checkBrowserSupport = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  }, []);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err: any) {
      setPermissionGranted(false);
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow microphone access and try again.'
        : 'Unable to access microphone. Please check your microphone settings.';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onError]);

  const startListening = useCallback(async () => {
    if (!checkBrowserSupport()) {
      const errorMsg = 'Speech recognition not supported. Please use Chrome, Edge, or Safari.';
      setError(errorMsg);
      setIsSupported(false);
      onError?.(errorMsg);
      return;
    }

    // Request microphone permission first
    if (permissionGranted === null) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const resultTranscript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += resultTranscript;
          } else {
            currentInterim += resultTranscript;
          }
        }

        // Update interim transcript for real-time display
        setInterimTranscript(currentInterim);

        if (finalTranscript) {
          console.log('🗣️ Final transcript:', finalTranscript);
          setTranscript(prev => prev + ' ' + finalTranscript);
          setInterimTranscript(''); // Clear interim when we get final
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        // Don't show common expected errors that don't require user action
        const ignoredErrors = ['aborted', 'no-speech'];
        
        if (ignoredErrors.includes(event.error)) {
          console.log(`Speech recognition ${event.error} (expected during normal operation)`);
          return; // Don't show these errors to the user
        }
        
        console.error('❌ Speech recognition error:', event.error);
        let errorMsg = `Speech recognition error: ${event.error}`;
        
        switch (event.error) {
          case 'not-allowed':
            errorMsg = 'Microphone access denied. Please allow microphone access.';
            setPermissionGranted(false);
            break;
          case 'audio-capture':
            errorMsg = 'No microphone found. Please check your microphone.';
            break;
          case 'network':
            errorMsg = 'Network error. Please check your internet connection.';
            break;
        }
        
        setError(errorMsg);
        onError?.(errorMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('🔚 Speech recognition ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error('❌ Failed to start speech recognition:', err);
      const errorMsg = 'Failed to start speech recognition. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsListening(false);
    }
  }, [checkBrowserSupport, permissionGranted, requestMicrophonePermission, continuous, language, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetAndTryAgain = useCallback(async () => {
    setError(null);
    setPermissionGranted(null);
    setTranscript('');
    setInterimTranscript('');
    stopListening();
    await requestMicrophonePermission();
  }, [requestMicrophonePermission, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  if (!isSupported) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">Speech Recognition Not Supported</p>
        <p className="text-red-600 text-sm mt-1">
          Please use Chrome, Edge, or Safari browser for speech recognition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className="flex items-center space-x-2"
          disabled={permissionGranted === false}
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5" />
              <span>Stop Listening</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span>Start Recitation</span>
            </>
          )}
        </Button>
      </div>

      {permissionGranted === false && (
        <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-700 font-medium">Microphone Permission Required</p>
          <p className="text-amber-600 text-sm mt-1 mb-3">
            Please allow microphone access to use speech recognition.
          </p>
          <Button onClick={resetAndTryAgain} size="sm" variant="outline">
            Grant Permission
          </Button>
        </div>
      )}

      {error && (
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1 mb-3">{error}</p>
          <Button onClick={resetAndTryAgain} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {isListening && (
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-medium">Listening...</span>
          </div>
          <p className="text-green-600 text-sm mt-1">
            Speak clearly in Arabic. Your speech will be detected automatically.
          </p>
        </div>
      )}

      {/* Transcript Display */}
      {(transcript || interimTranscript) && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">What you said:</h4>
            <Button onClick={clearTranscript} size="sm" variant="outline">
              Clear
            </Button>
          </div>
          
          {transcript && (
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-sm text-gray-600 mb-1">Final transcript:</p>
              <div className="text-right" dir="rtl">
                <p className="text-lg text-gray-900 font-arabic leading-relaxed">
                  {transcript}
                </p>
              </div>
            </div>
          )}
          
          {interimTranscript && (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-sm text-yellow-700 mb-1">Currently hearing:</p>
              <div className="text-right" dir="rtl">
                <p className="text-lg text-yellow-800 font-arabic leading-relaxed italic">
                  {interimTranscript}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};