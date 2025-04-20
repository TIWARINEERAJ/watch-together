import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Room, RoomWithErrorBoundary } from './components/Room';

function App() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    navigate('/room/new');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const roomId = formData.get('roomId') as string;
    if (roomId) {
      navigate(`/room/${roomId}`);
    }
  };

  // Show login form if username is not set
  if (!username) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">
            Watch Together
          </h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const name = formData.get('username') as string;
            if (name) setUsername(name);
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">
              Watch Together
            </h1>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Create a Room</h2>
                <form onSubmit={handleCreateRoom}>
                  <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Create New Room
                  </button>
                </form>
              </div>
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-2">Join a Room</h2>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room ID
                    </label>
                    <input
                      type="text"
                      name="roomId"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter room ID"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Join Room
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      } />
      <Route path="/room/:roomId" element={<RoomWithErrorBoundary username={username} />} />
    </Routes>
  );
}

export default App;
