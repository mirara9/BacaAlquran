import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Square, Volume2, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';

interface WaveformVisualizerProps {
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  recordedBlob?: Blob;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
  barWidth?: number;
  barGap?: number;
  responsive?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onFinish?: () => void;
  onSeek?: (position: number) => void;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioUrl,
  audioBuffer,
  recordedBlob,
  height = 128,
  waveColor = '#3b82f6',
  progressColor = '#1d4ed8',
  cursorColor = '#ef4444',
  barWidth = 2,
  barGap = 1,
  responsive = true,
  onReady,
  onPlay,
  onPause,
  onFinish,
  onSeek
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([1]);
  const [zoom, setZoom] = useState([1]);
  const [audioMetadata, setAudioMetadata] = useState<{
    sampleRate?: number;
    channels?: number;
    duration?: number;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor,
      progressColor,
      cursorColor,
      barWidth,
      barGap,
      normalize: true,
      interact: true,
      dragToSeek: true,
      hideScrollbar: true,
      minPxPerSec: 1
    });

    wavesurferRef.current = wavesurfer;

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsLoading(false);
      setDuration(wavesurfer.getDuration());
      
      // Get audio metadata
      const decodedData = wavesurfer.getDecodedData();
      if (decodedData) {
        setAudioMetadata({
          sampleRate: decodedData.sampleRate,
          channels: decodedData.numberOfChannels,
          duration: decodedData.duration
        });
      }
      
      onReady?.();
    });

    wavesurfer.on('play', () => {
      setIsPlaying(true);
      onPlay?.();
    });

    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      onPause?.();
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      onFinish?.();
    });

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    wavesurfer.on('seeking', (position) => {
      onSeek?.(position);
    });

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error:', error);
      setIsLoading(false);
    });

    // Load audio
    if (audioUrl) {
      setIsLoading(true);
      wavesurfer.load(audioUrl);
    } else if (recordedBlob) {
      setIsLoading(true);
      const url = URL.createObjectURL(recordedBlob);
      wavesurfer.load(url);
    }

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl, audioBuffer, recordedBlob, height, waveColor, progressColor, cursorColor, barWidth, barGap, responsive]);

  // Update volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume[0]);
    }
  }, [volume]);

  // Update zoom
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom[0]);
    }
  }, [zoom]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    }
  };

  const handleStop = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {/* Waveform Container */}
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Loading audio...</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={isLoading}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={isLoading}
          >
            <Square className="h-4 w-4" />
          </Button>
          
          {recordedBlob && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Time Display */}
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-gray-500" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={1}
            min={0}
            step={0.1}
            className="w-20"
          />
        </div>

        {/* Zoom Control */}
        <div className="flex items-center space-x-2">
          <ZoomOut className="h-4 w-4 text-gray-500" />
          <Slider
            value={zoom}
            onValueChange={setZoom}
            max={10}
            min={1}
            step={1}
            className="w-20"
          />
          <ZoomIn className="h-4 w-4 text-gray-500" />
        </div>
      </div>

      {/* Audio Metadata */}
      {audioMetadata.sampleRate && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Sample Rate:</span>
            <span>{audioMetadata.sampleRate} Hz</span>
          </div>
          <div className="flex justify-between">
            <span>Channels:</span>
            <span>{audioMetadata.channels}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{formatTime(audioMetadata.duration || 0)}</span>
          </div>
          {recordedBlob && (
            <div className="flex justify-between">
              <span>File Size:</span>
              <span>{formatFileSize(recordedBlob.size)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};