import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Simple room management
const rooms = new Map();
// Keep track of room creators to prevent immediate deletion
const roomCreators = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    rooms.set(roomId, new Set([socket.id]));
    roomCreators.set(roomId, socket.id);
    socket.join(roomId);
    
    console.log(`Room ${roomId} created by ${socket.id}`);
    
    // Emit to the client that created the room
    socket.emit('room-created', roomId);
  });

  // Join an existing room
  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} attempting to join room ${roomId}`);
    
    if (!rooms.has(roomId)) {
      console.log(`Room ${roomId} not found`);
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomId);
    if (room.size >= 2) {
      console.log(`Room ${roomId} is full`);
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.add(socket.id);
    socket.join(roomId);
    
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.emit('room-joined');
    socket.to(roomId).emit('peer-joined');
  });

  // Forward video state updates
  socket.on('video-state', (data) => {
    const { roomId, state } = data;
    console.log(`Received video state from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('video-state', state);
  });

  // Forward chat messages
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    console.log(`Received chat message from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('chat-message', message);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find all rooms this user is in
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        
        // Only delete the room if:
        // 1. The room is empty AND
        // 2. This isn't the room creator OR enough time has passed
        const isCreator = roomCreators.get(roomId) === socket.id;
        
        if (room.size === 0) {
          if (!isCreator) {
            console.log(`Room ${roomId} deleted (empty)`);
            rooms.delete(roomId);
            roomCreators.delete(roomId);
          } else {
            // Keep room alive for 5 minutes to allow rejoining
            console.log(`Room ${roomId} marked for delayed deletion`);
            setTimeout(() => {
              // Only delete if still empty after timeout
              if (rooms.has(roomId) && rooms.get(roomId).size === 0) {
                console.log(`Room ${roomId} deleted after timeout`);
                rooms.delete(roomId);
                roomCreators.delete(roomId);
              }
            }, 5 * 60 * 1000); // 5 minutes
          }
        } else {
          // Notify remaining users
          console.log(`Notifying remaining users in room ${roomId}`);
          socket.to(roomId).emit('peer-left');
        }
      }
    }
  });
});

// Keep the server alive
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const PORT = process.env.PORT || 3010;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 