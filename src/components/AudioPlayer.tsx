import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import './AudioPlayer.scss';

interface AudioPlayerProps {
  src: string;
  title: string;
  description?: string;
  duration?: string;
  mimeType?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  description,
  duration: durationProp,
  mimeType
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Disable right-click context menu
    const handleContextMenu = (e: Event) => e.preventDefault();
    
    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.key === 'F5' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    // Disable drag and drop
    const handleDragStart = (e: Event) => e.preventDefault();

    audio.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    audio.addEventListener('dragstart', handleDragStart);

    return () => {
      audio.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      audio.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player-container">
      <div className="audio-player">
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          controls={false}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            display: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
        />
        
        {isLoading && (
          <div className="audio-loading">
            <div className="loading-spinner"></div>
            <p>Loading audio...</p>
          </div>
        )}

        <div className="audio-visualizer">
          <div className="waveform">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className={`bar ${isPlaying ? 'animate' : ''}`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: `${Math.random() * 60 + 20}%`
                }}
              />
            ))}
          </div>
        </div>

        <div className="audio-controls">
          <div className="audio-progress">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="progress-bar"
            />
            <div className="time-display">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          <div className="audio-controls-bottom">
            <div className="audio-controls-left">
              <button className="control-btn" onClick={skipBackward}>
                <SkipBack size={20} />
              </button>
              
              <button className="control-btn play-btn" onClick={togglePlay}>
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              
              <button className="control-btn" onClick={skipForward}>
                <SkipForward size={20} />
              </button>
            </div>
            
            <div className="audio-controls-right">
              <button className="control-btn" onClick={toggleMute}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-bar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Info Section */}
      <div className="audio-info">
        <h3 className="audio-info-title">{title}</h3>
        {description && (
          <p className="audio-info-description">{description}</p>
        )}
        <div className="audio-info-meta">
          {mimeType && (
            <span className="meta-badge">{mimeType}</span>
          )}
          {durationProp && (
            <span className="meta-badge">{durationProp}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
