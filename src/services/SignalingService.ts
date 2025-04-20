import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface SignalingEvents {
  signal: (data: any) => void;
  connected: () => void;
  disconnected: (reason?: string) => void;
  roomFull: () => void;
  error: (error: Error) => void;
  peerJoined: () => void;
  peerLeft: () => void;
}

export class SignalingService extends EventEmitter {
  private socket: Socket;
  private roomId: string | null = null;

  constructor(private serverUrl: string = 'http://localhost:3001') {
    super();
    this.socket = io(serverUrl);
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('signal', (data: any) => {
      console.log('Received signal:', data);
      this.emit('signal', data);
    });

    this.socket.on('room-full', () => {
      console.log('Room is full');
      this.emit('roomFull');
    });

    this.socket.on('peer-joined', () => {
      console.log('Peer joined the room');
      this.emit('peerJoined');
    });

    this.socket.on('peer-left', () => {
      console.log('Peer left the room');
      this.emit('peerLeft');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('error', error);
    });
  }

  public joinRoom(roomId: string): void {
    this.roomId = roomId;
    this.socket.emit('join-room', roomId);
  }

  public leaveRoom(): void {
    if (this.roomId) {
      this.socket.emit('leave-room', this.roomId);
      this.roomId = null;
    }
  }

  public sendSignal(data: any): void {
    if (this.roomId) {
      this.socket.emit('signal', data);
    }
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  public isConnected(): boolean {
    return this.socket.connected;
  }

  public getCurrentRoom(): string | null {
    return this.roomId;
  }
} 