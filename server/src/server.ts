import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Track rooms and their participants
const rooms = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('signal', (data) => {
    const roomId = Array.from(socket.rooms)[1];
    if (roomId) {
      socket.to(roomId).emit('signal', data);
    }
  });

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId)!;
    if (room.size >= 2) {
      socket.emit('room-full');
      return;
    }

    socket.join(roomId);
    room.add(socket.id);
    
    // Notify others in the room
    socket.to(roomId).emit('peer-joined');
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
      } else {
        // Notify others in the room
        socket.to(roomId).emit('peer-left');
      }
    }
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(roomId);
        } else {
          // Notify others in the room
          socket.to(roomId).emit('peer-left');
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 