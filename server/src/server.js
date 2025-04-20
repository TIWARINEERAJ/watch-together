import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { writeFileSync } from 'fs';
import { join } from 'path';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Simple room management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    rooms.set(roomId, new Set([socket.id]));
    socket.join(roomId);
    
    console.log(`Room ${roomId} created by ${socket.id}`);
    socket.emit('room-created', roomId);
  });

  // Join an existing room
  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} attempting to join room ${roomId}`);
    
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomId);
    if (room.size >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.add(socket.id);
    socket.join(roomId);
    
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.emit('room-joined');
    socket.to(roomId).emit('peer-joined');
  });

  // Relay signaling data
  socket.on('signal', (data) => {
    const { roomId, signal } = data;
    console.log(`Relaying signal from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('signal', signal);
  });

  // Handle video state updates
  socket.on('video-state', (data) => {
    const { roomId, state } = data;
    console.log(`Relaying video state from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('video-state', state);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    console.log(`Relaying chat message from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('chat-message', message);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from all rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          socket.to(roomId).emit('peer-left');
          console.log(`Notified peers in room ${roomId} that user left`);
        }
      }
    }
  });
});

// Try different ports in sequence
const tryPort = (port) => {
  return new Promise((resolve, reject) => {
    const tempServer = createServer();
    
    tempServer.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying next...`);
        resolve(false);
      } else {
        reject(err);
      }
    });
    
    tempServer.once('listening', () => {
      tempServer.close(() => {
        console.log(`Found available port: ${port}`);
        resolve(true);
      });
    });
    
    tempServer.listen(port);
  });
};

const startServer = async () => {
  // Try ports starting from 3000 up to 3099
  let port = 3000;
  let available = false;
  
  while (!available && port < 3100) {
    try {
      available = await tryPort(port);
      if (!available) port++;
    } catch (err) {
      console.error(`Error checking port ${port}:`, err);
      port++;
    }
  }
  
  if (!available) {
    console.error('No available ports found between 3000-3099');
    process.exit(1);
  }
  
  // Write port to a file so frontend knows which port to connect to
  try {
    const portFile = join(process.cwd(), '..', 'port.txt');
    writeFileSync(portFile, port.toString());
    console.log(`Wrote port ${port} to ${portFile}`);
  } catch (err) {
    console.error('Error writing port file:', err);
  }
  
  // Start the actual server on the available port
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer(); 