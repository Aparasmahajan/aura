import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import './VideoPlayer.scss';

interface VideoPlayerProps {
  src: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string;
  resolution?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  description,
  thumbnailUrl,
  duration: durationProp,
  resolution
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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

    video.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    video.addEventListener('dragstart', handleDragStart);

    return () => {
      video.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      video.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    // Prevent event bubbling if clicking on controls
    if (e) {
      e.stopPropagation();
    }
    
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div className="video-player-container">
      <div 
        className="video-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={src}
          poster={thumbnailUrl}
          className="video-element"
          preload="metadata"
          controls={false}
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onContextMenu={(e) => e.preventDefault()}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
        />
        
        {isLoading && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
            <p>Loading video...</p>
          </div>
        )}

        <div className={`video-controls ${showControls ? 'show' : 'hide'}`}>
          <div className="video-progress" onClick={(e) => e.stopPropagation()}>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="progress-bar"
            />
          </div>
          
          <div className="video-controls-bottom">
            <div className="video-controls-left">
              <button className="control-btn" onClick={(e) => togglePlay(e)}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button className="control-btn" onClick={(e) => toggleMute(e)}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              <span className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div className="video-controls-right">
              <button className="control-btn" onClick={(e) => toggleFullscreen(e)}>
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Info Section */}
      <div className="video-info">
        <h3 className="video-info-title">{title}</h3>
        {description && (
          <p className="video-info-description">{description}</p>
        )}
        <div className="video-info-meta">
          {resolution && (
            <span className="meta-badge">{resolution}</span>
          )}
          {durationProp && (
            <span className="meta-badge">{durationProp}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
