import React, { useCallback, useRef, useState, useEffect } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import type { VideoState } from '../services/WebRTC';

interface VideoPlayerProps {
  videoId: string;
  isHost: boolean;
  onStateUpdate: (state: VideoState) => void;
  remoteState?: VideoState;
  isConnected: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  isHost,
  onStateUpdate,
  remoteState,
  isConnected,
}) => {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const [videoIdState, setVideoId] = useState(videoId);

  // Initialize player when ready
  const initializePlayer = useCallback(async () => {
    if (!playerRef.current || initializingRef.current) return;
    
    try {
      initializingRef.current = true;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for player to be ready
      setIsReady(true);
    } catch (err) {
      console.error('Error initializing player:', err);
      setError('Error initializing video player');
    } finally {
      initializingRef.current = false;
    }
  }, []);

  // Handle video state updates from peer
  useEffect(() => {
    if (!isHost && isReady && isConnected && remoteState && playerRef.current) {
      handleRemoteStateUpdate(remoteState);
    }
  }, [remoteState, isHost, isReady, isConnected]);

  // Periodic sync check for guests
  useEffect(() => {
    if (!isHost && isReady && isConnected && playerRef.current) {
      const syncInterval = setInterval(async () => {
        if (!playerRef.current || !remoteState) return;
        
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          if (Math.abs(currentTime - remoteState.currentTime) > 2) {
            handleRemoteStateUpdate(remoteState);
          }
        } catch (err) {
          console.error('Error during sync check:', err);
        }
      }, 5000);

      return () => clearInterval(syncInterval);
    }
  }, [isHost, isReady, isConnected, remoteState]);

  useEffect(() => {
    if (!isHost && remoteState?.videoId && remoteState.videoId !== videoId) {
      console.log('Guest updating video ID:', remoteState.videoId);
      setVideoId(remoteState.videoId);
    }
  }, [isHost, remoteState?.videoId, videoId]);

  const handleRemoteStateUpdate = async (state: VideoState) => {
    if (!playerRef.current || isSyncing) return;
    console.log('Handling remote state update:', state);

    try {
      setIsSyncing(true);
      const player = playerRef.current;
      const currentTime = await player.getCurrentTime();
      
      if (Math.abs(currentTime - state.currentTime) > 1) {
        await player.seekTo(state.currentTime, true);
      }

      if (state.isPlaying) {
        await player.playVideo();
      } else {
        await player.pauseVideo();
      }
    } catch (err) {
      console.error('Error syncing video:', err);
      setError('Error syncing video state');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStateChange = async (event: YouTubeEvent) => {
    if (!isHost || !isReady || isSyncing || !isConnected || !playerRef.current) return;

    try {
      const currentTime = await playerRef.current.getCurrentTime();
      const isPlaying = event.data === YouTube.PlayerState.PLAYING;

      onStateUpdate({
        currentTime,
        isPlaying,
        videoId: videoIdState,
      });
    } catch (err) {
      console.error('Error updating video state:', err);
      setError('Error updating video state');
    }
  };

  const handleError = (error: any) => {
    console.error('YouTube Player Error:', error);
    setError('Error loading video. Please check the video ID and try again.');
  };

  const handleReady = async (event: YouTubeEvent) => {
    console.log('Player ready');
    playerRef.current = event.target;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!isHost && remoteState) {
        await handleRemoteStateUpdate(remoteState);
      }
      setIsReady(true);
      setError(null);
    } catch (err) {
      console.error('Error in handleReady:', err);
      setError('Error initializing video player');
    }
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const currentVideoId = extractVideoId(videoId) || videoId;

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      {error && (
        <div className="absolute inset-0 bg-red-100 bg-opacity-90 flex items-center justify-center p-4 z-10">
          <div className="text-red-700 text-center">
            <p>{error}</p>
            {isHost && (
              <button
                onClick={() => setError(null)}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {videoId ? (
        <YouTube
          videoId={videoId}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onError={handleError}
          opts={{
            height: '100%',
            width: '100%',
            playerVars: {
              autoplay: 1,
              controls: isHost ? 1 : 0,
              modestbranding: 1,
              rel: 0,
              origin: window.location.origin,
              enablejsapi: 1,
              playsinline: 1
            },
          }}
          className="absolute inset-0"
          iframeClassName="w-full h-full"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white">
          {isHost ? 'Enter a YouTube URL to begin' : 'Waiting for host to select a video'}
        </div>
      )}

      {!isConnected && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Connecting to peer...</p>
          </div>
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading video player...</p>
          </div>
        </div>
      )}

      {!isHost && isConnected && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center py-2">
          Viewing as Guest - Playback controlled by host
        </div>
      )}
    </div>
  );
}; 