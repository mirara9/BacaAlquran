import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { WaveformVisualizer } from './WaveformVisualizer';
import { AudioService, AudioFeatures, RecordingData } from '@/services/AudioService';
import { RecitationAnalysisService, RecitationAnalysisResult } from '@/services/RecitationAnalysisService';

interface AudioRecorderProps {
  expectedText?: string;
  referenceAudio?: AudioBuffer;
  maxDuration?: number;
  onRecordingComplete?: (data: RecordingData) => void;
  onAnalysisComplete?: (result: RecitationAnalysisResult) => void;
  onError?: (error: string) => void;
  enableAnalysis?: boolean;
  enableVisualization?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  expectedText,
  referenceAudio,
  maxDuration = 300, // 5 minutes
  onRecordingComplete,
  onAnalysisComplete,
  onError,
  enableAnalysis = true,
  enableVisualization = true
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RecitationAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFeatures, setCurrentFeatures] = useState<AudioFeatures | null>(null);
  
  const audioService = useRef<AudioService | null>(null);
  const analysisService = useRef<RecitationAnalysisService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingBlob = useRef<Blob | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize AudioService
        audioService.current = new AudioService({
          bufferSize: 2048,
          hopSize: 512,
          sampleRate: 44100,
          mfccCoefficients: 13,
          enableFeatureExtraction: true,
          enableRealTimeProcessing: true
        });

        await audioService.current.initialize();

        // Set up callbacks
        audioService.current.setOnAudioLevelCallback(setAudioLevel);
        audioService.current.setOnFeaturesCallback(setCurrentFeatures);

        // Initialize AnalysisService
        analysisService.current = new RecitationAnalysisService();

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize audio services:', error);
        onError?.(`Failed to initialize audio: ${error}`);
      }
    };

    initializeServices();

    return () => {
      if (audioService.current) {
        audioService.current.dispose();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onError]);

  const startRecording = async () => {
    if (!audioService.current || !isInitialized) {
      onError?.('Audio service not initialized');
      return;
    }

    try {
      await audioService.current.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setRecordingData(null);
      setAnalysisResult(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.(`Failed to start recording: ${error}`);
    }
  };

  const pauseRecording = () => {
    if (audioService.current && isRecording && !isPaused) {
      audioService.current.pauseRecording();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (audioService.current && isRecording && isPaused) {
      audioService.current.resumeRecording();
      setIsPaused(false);
      
      // Restart timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (!audioService.current || !isRecording) return;

    try {
      const data = await audioService.current.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingData(data);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Create blob for visualization
      const arrayBuffer = new ArrayBuffer(data.audioBuffer.length * 4);
      const view = new Float32Array(arrayBuffer);
      data.audioBuffer.copyFromChannel(view, 0);
      recordingBlob.current = new Blob([arrayBuffer], { type: 'audio/wav' });

      onRecordingComplete?.(data);

      // Start analysis if enabled
      if (enableAnalysis && analysisService.current && expectedText) {
        await analyzeRecording(data);
      }

    } catch (error) {
      console.error('Failed to stop recording:', error);
      onError?.(`Failed to stop recording: ${error}`);
    }
  };

  const analyzeRecording = async (data: RecordingData) => {
    if (!analysisService.current || !expectedText) return;

    try {
      setIsAnalyzing(true);
      const result = await analysisService.current.analyzeRecitation(
        data,
        expectedText,
        referenceAudio
      );
      setAnalysisResult(result);
      onAnalysisComplete?.(result);
    } catch (error) {
      console.error('Failed to analyze recording:', error);
      onError?.(`Failed to analyze recording: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetRecording = () => {
    setRecordingData(null);
    setAnalysisResult(null);
    setRecordingTime(0);
    setAudioLevel(0);
    recordingBlob.current = null;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRecordingState = () => {
    if (isRecording && isPaused) return 'paused';
    if (isRecording) return 'recording';
    if (recordingData) return 'completed';
    return 'ready';
  };

  const recordingProgress = (recordingTime / maxDuration) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isInitialized}
          className="flex items-center space-x-2"
        >
          {isRecording ? (
            <>
              <Square className="h-5 w-5" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span>Start Recording</span>
            </>
          )}
        </Button>

        {isRecording && (
          <Button
            variant="outline"
            size="lg"
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="flex items-center space-x-2"
          >
            {isPaused ? (
              <>
                <Play className="h-5 w-5" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-5 w-5" />
                <span>Pause</span>
              </>
            )}
          </Button>
        )}

        {recordingData && (
          <Button
            variant="outline"
            size="lg"
            onClick={resetRecording}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* Recording Status */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            getRecordingState() === 'recording' ? 'bg-red-500 animate-pulse' :
            getRecordingState() === 'paused' ? 'bg-yellow-500' :
            getRecordingState() === 'completed' ? 'bg-green-500' :
            'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {getRecordingState() === 'recording' ? 'Recording...' :
             getRecordingState() === 'paused' ? 'Paused' :
             getRecordingState() === 'completed' ? 'Recording Complete' :
             'Ready to Record'}
          </span>
        </div>
        
        <div className="text-2xl font-mono">
          {formatTime(recordingTime)}
        </div>
        
        <div className="text-sm text-gray-500">
          Max: {formatTime(maxDuration)}
        </div>
      </div>

      {/* Recording Progress */}
      {isRecording && (
        <Progress value={recordingProgress} className="w-full" />
      )}

      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Audio Level</span>
            <span className="text-sm font-mono">{Math.round(audioLevel)}%</span>
          </div>
          <Progress value={audioLevel} className="w-full" />
        </div>
      )}

      {/* Real-time Features Display */}
      {currentFeatures && isRecording && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Real-time Analysis</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Energy:</span>
              <span className="ml-2 font-mono">{currentFeatures.energy.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">ZCR:</span>
              <span className="ml-2 font-mono">{currentFeatures.zeroCrossingRate.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Spectral Centroid:</span>
              <span className="ml-2 font-mono">{currentFeatures.spectralCentroid.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Pitch:</span>
              <span className="ml-2 font-mono">{currentFeatures.pitch?.toFixed(1) || 'N/A'} Hz</span>
            </div>
          </div>
        </div>
      )}

      {/* Waveform Visualization */}
      {enableVisualization && recordingData && recordingBlob.current && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Recording Playback</h3>
          <WaveformVisualizer
            recordedBlob={recordingBlob.current}
            height={120}
            waveColor="#3b82f6"
            progressColor="#1d4ed8"
          />
        </div>
      )}

      {/* Analysis Results */}
      {isAnalyzing && (
        <div className="flex items-center justify-center space-x-2 p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-gray-600 dark:text-gray-300">Analyzing recitation...</span>
        </div>
      )}

      {analysisResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Analysis Results</h3>
          
          {/* Overall Score */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Score</span>
              <span className="text-2xl font-bold text-blue-600">{analysisResult.score.overall}%</span>
            </div>
            <Progress value={analysisResult.score.overall} className="w-full" />
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tajweed</span>
                <span className="text-sm font-mono">{analysisResult.score.tajweed}%</span>
              </div>
              <Progress value={analysisResult.score.tajweed} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Pronunciation</span>
                <span className="text-sm font-mono">{analysisResult.score.pronunciation}%</span>
              </div>
              <Progress value={analysisResult.score.pronunciation} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Timing</span>
                <span className="text-sm font-mono">{analysisResult.score.timing}%</span>
              </div>
              <Progress value={analysisResult.score.timing} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Fluency</span>
                <span className="text-sm font-mono">{analysisResult.score.fluency}%</span>
              </div>
              <Progress value={analysisResult.score.fluency} className="h-2" />
            </div>
          </div>

          {/* Feedback */}
          {analysisResult.feedback.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Feedback</h4>
              <ul className="text-sm space-y-1">
                {analysisResult.feedback.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysisResult.recommendations.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Recommendations</h4>
              <ul className="text-sm space-y-1">
                {analysisResult.recommendations.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tajweed Errors */}
          {analysisResult.tajweedErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Tajweed Errors ({analysisResult.tajweedErrors.length})</h4>
              <div className="space-y-2">
                {analysisResult.tajweedErrors.map((error, index) => (
                  <div key={index} className="border-l-4 border-red-400 pl-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{error.rule.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        error.rule.severity === 'major' ? 'bg-red-100 text-red-800' :
                        error.rule.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {error.rule.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{error.correction}</p>
                    <p className="text-xs text-gray-500">
                      At {error.position.toFixed(1)}s (confidence: {Math.round(error.confidence * 100)}%)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};