import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRealtimeSpeechRecognition } from '@/hooks/useRealtimeSpeechRecognition';

export const TestSpeechRecognition: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    clearTranscript
  } = useRealtimeSpeechRecognition({
    onResult: (result) => {
      console.log('Speech result:', result);
      setResults(prev => [...prev, result.transcript]);
    },
    onError: (error) => {
      console.error('Speech error:', error);
    }
  });

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Speech Recognition Test</h2>
      
      <div className="space-y-2 mb-4">
        <p>Supported: {isSupported ? 'Yes' : 'No'}</p>
        <p>Listening: {isListening ? 'Yes' : 'No'}</p>
        <p>Confidence: {confidence}%</p>
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>

      <div className="space-x-2 mb-4">
        <Button 
          onClick={startListening} 
          disabled={!isSupported || isListening}
          variant={isListening ? "destructive" : "default"}
        >
          {isListening ? 'Listening...' : 'Start Listening'}
        </Button>
        <Button onClick={stopListening} disabled={!isListening}>
          Stop
        </Button>
        <Button onClick={clearTranscript}>
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <strong>Current Transcript:</strong>
          <p className="bg-gray-100 p-2 rounded">{transcript || '(no transcript yet)'}</p>
        </div>
        
        <div>
          <strong>Interim:</strong>
          <p className="bg-yellow-100 p-2 rounded">{interimTranscript || '(no interim text)'}</p>
        </div>

        <div>
          <strong>Results History:</strong>
          {results.length === 0 ? (
            <p className="text-gray-500">No results yet</p>
          ) : (
            <ul className="space-y-1">
              {results.map((result, index) => (
                <li key={index} className="bg-green-100 p-2 rounded text-sm">
                  {result}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};