import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import YouTube from 'react-youtube';

function App() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [videoId, setVideoId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  const socketRef = useRef(null);
  const playerRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    // Use a fixed port for simplicity
    const socket = io('http://localhost:3010', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
      setConnectionStatus('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('Disconnected from server');
      setIsInRoom(false);
    });

    socket.on('error', (error) => {
      console.error('Server error:', error);
      setConnectionStatus(`Error: ${error.message}`);
      alert(error.message);
    });

    socket.on('room-created', (newRoomId) => {
      console.log('Room created:', newRoomId);
      setRoomId(newRoomId);
      setIsInRoom(true);
      setConnectionStatus(`Hosting room: ${newRoomId}`);
    });

    socket.on('room-joined', () => {
      console.log('Joined room:', roomId);
      setIsInRoom(true);
      setConnectionStatus(`Joined room: ${roomId}`);
    });

    socket.on('peer-joined', () => {
      console.log('Peer joined the room');
      setConnectionStatus(`Connected with peer in room: ${roomId}`);
    });

    socket.on('peer-left', () => {
      console.log('Peer left the room');
      setConnectionStatus(`Alone in room: ${roomId}`);
    });

    socket.on('video-state', (state) => {
      console.log('Received video state:', state);
      
      // Handle video ID updates for all users
      if (state.videoId) {
        console.log('Setting video ID from state update:', state.videoId);
        setVideoId(state.videoId);
      }
      
      // Only handle playback controls for non-hosts
      if (!isHost && playerRef.current && state.currentTime !== undefined) {
        try {
          const player = playerRef.current.internalPlayer;
          
          // Sync time if needed
          const currentTime = player.getCurrentTime();
          if (Math.abs(currentTime - state.currentTime) > 2) {
            player.seekTo(state.currentTime);
          }
          
          // Sync play/pause state
          if (state.isPlaying) {
            player.playVideo();
          } else {
            player.pauseVideo();
          }
        } catch (err) {
          console.error('Error syncing video:', err);
        }
      }
    });

    socket.on('chat-message', (message) => {
      console.log('Received chat message:', message);
      setMessages((prev) => [...prev, message]);
    });

    // Add this to handle reconnection
    socket.io.on("reconnect", (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
      setConnectionStatus('Reconnected to server');
      
      // Rejoin room if we were in one
      if (roomId && isInRoom) {
        if (isHost) {
          console.log('Recreating room after reconnection');
          socket.emit('create-room');
        } else {
          console.log('Rejoining room after reconnection');
          socket.emit('join-room', roomId);
        }
      }
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
    };
  }, []); // Empty dependency array to run once

  // Add this useEffect for periodic sync from host to guest
  useEffect(() => {
    if (!isHost || !playerRef.current || !socketRef.current || !roomId || !videoId) return;
    
    // Send video state every 5 seconds to ensure sync
    const syncInterval = setInterval(() => {
      try {
        const player = playerRef.current.internalPlayer;
        const state = {
          videoId,
          currentTime: player.getCurrentTime(),
          isPlaying: player.getPlayerState() === 1 // YouTube.PlayerState.PLAYING
        };
        
        console.log('Host sending periodic sync:', state);
        socketRef.current.emit('video-state', { roomId, state });
      } catch (err) {
        console.error('Error during periodic sync:', err);
      }
    }, 5000);
    
    return () => clearInterval(syncInterval);
  }, [isHost, roomId, videoId]);

  // Helper functions
  const createRoom = () => {
    if (!socketRef.current || !username) return;
    setIsHost(true);
    socketRef.current.emit('create-room');
  };

  const joinRoom = () => {
    if (!socketRef.current || !username || !roomId) return;
    setIsHost(false);
    socketRef.current.emit('join-room', roomId);
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!socketRef.current || !newMessage.trim() || !roomId) return;

    const message = {
      text: newMessage.trim(),
      sender: username,
      timestamp: Date.now()
    };

    socketRef.current.emit('chat-message', { roomId, message });
    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const handleVideoSubmit = (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) {
      const newVideoId = match[1];
      console.log('Setting video ID to:', newVideoId);
      setVideoId(newVideoId);
      setVideoUrl('');
      
      // Send video state to peer immediately
      if (socketRef.current && roomId) {
        console.log('Sending initial video state with ID:', newVideoId);
        socketRef.current.emit('video-state', {
          roomId,
          state: {
            videoId: newVideoId,
            currentTime: 0,
            isPlaying: true
          }
        });
      }
    }
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    console.log('Player ready');
  };

  const onPlayerStateChange = (event) => {
    if (!isHost || !playerRef.current || !socketRef.current || !roomId) return;
    
    try {
      const player = playerRef.current.internalPlayer;
      const state = {
        videoId,
        currentTime: player.getCurrentTime(),
        isPlaying: event.data === 1 // YouTube.PlayerState.PLAYING
      };
      
      console.log('Sending video state:', state);
      socketRef.current.emit('video-state', { roomId, state });
    } catch (err) {
      console.error('Error sending video state:', err);
    }
  };

  // Render login form
  if (!username) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Watch Together</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            setUsername(e.target.username.value);
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                name="username"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter your name"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render room creation/joining form
  if (!isInRoom) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Watch Together</h1>
          <p className="text-center mb-4 text-gray-600">{connectionStatus}</p>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Create a Room</h2>
            <button
              onClick={createRoom}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg mb-4"
            >
              Create New Room
            </button>
          </div>
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-2">Join a Room</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              joinRoom();
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Enter room ID"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render room with video and chat
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">
            {isHost ? 'Hosting Room' : 'Joined Room'}: {roomId}
          </h2>
          <p className="text-sm text-gray-600 mb-4">{connectionStatus}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video section */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-4">
            {isHost && (
              <form onSubmit={handleVideoSubmit} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg"
                    placeholder="Enter YouTube URL"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  >
                    Set Video
                  </button>
                </div>
              </form>
            )}

            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {videoId ? (
                <YouTube
                  key={videoId}
                  videoId={videoId}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  opts={{
                    height: '100%',
                    width: '100%',
                    playerVars: {
                      autoplay: 1,
                      controls: isHost ? 1 : 0,
                      modestbranding: 1,
                      rel: 0,
                      origin: window.location.origin
                    }
                  }}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  {isHost ? 'Enter a YouTube URL to begin' : 'Waiting for host to select a video'}
                </div>
              )}
            </div>

            {!isHost && (
              <div className="p-2 bg-blue-50 rounded-lg mt-2">
                <p>Debug Info:</p>
                <ul className="list-disc pl-5 text-sm">
                  <li>Video ID: {videoId || 'None'}</li>
                  <li>Player Ready: {playerRef.current ? 'Yes' : 'No'}</li>
                  <li>Connection Status: {connectionStatus}</li>
                </ul>
              </div>
            )}
          </div>

          {/* Chat section */}
          <div className="bg-white rounded-lg shadow-lg p-4 h-[600px] flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Chat</h2>
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`${
                    message.sender === username ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-lg ${
                      message.sender === username
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {message.sender === username ? 'You' : message.sender}
                    </div>
                    <div>{message.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendChatMessage} className="mt-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 
