import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from './VideoPlayer';
import { Chat } from './Chat';
import { WebRTCService } from '../services/WebRTCService';
import type { VideoState, ConnectionStatus, ChatMessage } from '../services/types';
import { ErrorBoundary } from 'react-error-boundary';

interface RoomProps {
  username: string;
}

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="min-h-screen bg-red-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <h1 className="text-2xl font-bold text-center text-red-600 mb-4">Something went wrong</h1>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
      >
        Try again
      </button>
    </div>
  </div>
);

export const Room: React.FC<RoomProps> = ({ username }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteState, setRemoteState] = useState<VideoState | undefined>();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false
  });
  const [hasPeer, setHasPeer] = useState(false);
  const [actualRoomId, setActualRoomId] = useState<string | null>(null);

  // Listen for room created event
  useEffect(() => {
    const handleRoomCreated = (newRoomId: string) => {
      console.log('Room created with ID:', newRoomId);
      setActualRoomId(newRoomId);
      // Update URL without full page reload
      navigate(`/room/${newRoomId}`, { replace: true });
    };

    // Add event listener for room-created
    window.addEventListener('room-created', (e: any) => {
      handleRoomCreated(e.detail);
    });

    return () => {
      window.removeEventListener('room-created', (e: any) => {
        handleRoomCreated(e.detail);
      });
    };
  }, [navigate]);

  // Initialize room and determine if user is host
  useEffect(() => {
    if (!username || !roomId) {
      navigate('/');
      return;
    }

    console.log('Initializing room with ID:', roomId);
    
    // Determine if this is a new room
    const isNewRoom = roomId === 'new';
    setIsHost(isNewRoom);

    // Create WebRTC service
    const rtc = new WebRTCService(
      handleVideoStateUpdate,
      handleChatMessage,
      handleConnectionStatus,
      handlePeerJoined,
      handlePeerLeft,
      username
    );

    // Set up event handler for room creation
    if (isNewRoom) {
      rtc.onRoomCreated = (newRoomId) => {
        console.log('Room created callback with ID:', newRoomId);
        setActualRoomId(newRoomId);
        // Update URL without full page reload
        navigate(`/room/${newRoomId}`, { replace: true });
      };
    } else {
      setActualRoomId(roomId);
    }

    // Initialize the peer connection
    rtc.initiatePeer(isNewRoom, isNewRoom ? '' : roomId);
    setWebrtc(rtc);

    // Clean up on unmount
    return () => {
      rtc.cleanup();
    };
  }, [username, roomId, navigate]);

  // Handle video state updates from peer
  const handleVideoStateUpdate = useCallback((state: VideoState) => {
    console.log('Received video state update:', state);
    if (webrtc) {
      webrtc.updateVideoState(state);
    }
    setRemoteState(state);
  }, [webrtc]);

  // Handle chat messages from peer
  const handleChatMessage = useCallback((message: ChatMessage) => {
    console.log('Received chat message:', message);
    setMessages(prev => [...prev, message]);
  }, []);

  // Handle connection status updates
  const handleConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  // Handle peer joining the room
  const handlePeerJoined = useCallback(() => {
    setHasPeer(true);
  }, []);

  // Handle peer leaving the room
  const handlePeerLeft = useCallback(() => {
    setHasPeer(false);
  }, []);

  // Handle video URL submission
  const handleVideoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('videoUrl') as HTMLInputElement).value;
    
    // Support various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/,
    ];

    let videoId = null;
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }

    if (videoId) {
      setVideoId(videoId);
      if (webrtc) {
        webrtc.updateVideoState({
          videoId,
          currentTime: 0,
          isPlaying: false
        });
      }
    } else {
      // If input is not a URL, treat it as a direct video ID
      setVideoId(input);
      if (webrtc) {
        webrtc.updateVideoState({
          videoId: input,
          currentTime: 0,
          isPlaying: false
        });
      }
    }
  };

  // Handle sending chat messages
  const handleSendMessage = (text: string) => {
    if (!webrtc || !username) return;

    const message: ChatMessage = {
      text,
      sender: username,
      timestamp: Date.now()
    };

    webrtc.sendChatMessage(message);
    setMessages(prev => [...prev, message]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Connection status */}
        {!connectionStatus.connected && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
            Waiting for peer connection...
          </div>
        )}

        {/* No peer warning */}
        {connectionStatus.connected && !hasPeer && (
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            Waiting for another user to join...
          </div>
        )}

        {/* Video URL input for host */}
        {isHost && !videoId && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <form onSubmit={handleVideoSubmit} className="space-y-4">
              <div>
                <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter YouTube Video URL or ID
                </label>
                <input
                  id="videoUrl"
                  name="videoUrl"
                  type="text"
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Set Video
              </button>
            </form>
          </div>
        )}
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {videoId ? (
              <VideoPlayer
                videoId={remoteState?.videoId || videoId}
                isHost={isHost}
                onStateUpdate={handleVideoStateUpdate}
                remoteState={remoteState}
                isConnected={connectionStatus.connected}
              />
            ) : (
              <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-white">
                {isHost ? 'Enter a YouTube URL to begin' : 'Waiting for host to select a video'}
              </div>
            )}
          </div>
          <div className="h-[400px] lg:h-[600px]">
            <Chat
              messages={messages}
              onSendMessage={(text) => {
                if (webrtc) {
                  webrtc.sendChatMessage(text);
                }
              }}
              username={username}
              isConnected={connectionStatus.connected}
            />
          </div>
        </div>

        {/* Room information */}
        <div className="bg-white rounded-lg shadow-lg p-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Room Information</h3>
          <p className="text-gray-600">Room ID: {actualRoomId || roomId}</p>
          <p className="text-gray-600">Your Role: {isHost ? 'Host' : 'Guest'}</p>
          <p className="text-gray-600">Connection: {connectionStatus.connected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-gray-600">Peer: {hasPeer ? 'Present' : 'Not Present'}</p>
          
          {(actualRoomId && actualRoomId !== 'new') && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">Share this link with your friend:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/room/${actualRoomId}`}
                  className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/room/${actualRoomId}`);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrap the Room component with ErrorBoundary
export const RoomWithErrorBoundary: React.FC<RoomProps> = (props) => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onReset={() => {
      // Reset the app state here
      window.location.href = '/';
    }}
  >
    <Room {...props} />
  </ErrorBoundary>
); 