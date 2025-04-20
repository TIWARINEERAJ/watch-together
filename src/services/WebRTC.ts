import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';

export interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  videoId: string;
}

export interface ChatMessage {
  text: string;
  sender: string;
  timestamp: number;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

interface DataMessage {
  type: 'videoState' | 'chat' | 'ping';
  payload: any;
}

export class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private socket: Socket;
  private roomId: string | null = null;
  private isHost: boolean = false;

  // Add a callback for room creation
  public onRoomCreated: ((roomId: string) => void) | null = null;

  constructor(
    private onStateUpdate: (state: VideoState) => void,
    private onMessage: (message: ChatMessage) => void,
    private onConnectionStatus: (status: ConnectionStatus) => void,
    private onPeerJoined?: () => void,
    private onPeerLeft?: () => void,
    public username: string = 'User'
  ) {
    // Initialize socket connection
    this.socket = io('http://localhost:3003', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.onConnectionStatus({ connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.onConnectionStatus({
        connected: false,
        error: `Connection error: ${error.message}`
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.onConnectionStatus({ 
        connected: false, 
        error: 'Disconnected from server' 
      });
      this.cleanupPeer();
    });

    this.socket.on('room-created', (roomId: string) => {
      console.log('Room created:', roomId);
      this.roomId = roomId;
      this.isHost = true;
      
      // Dispatch custom event for room creation
      window.dispatchEvent(new CustomEvent('room-created', { detail: roomId }));
      
      // Call the callback if provided
      if (this.onRoomCreated) {
        this.onRoomCreated(roomId);
      }
      
      // Initialize as initiator
      this.setupPeer(true);
    });

    this.socket.on('room-joined', (roomId: string, isInitiator: boolean) => {
      console.log('Room joined:', roomId, 'isInitiator:', isInitiator);
      this.roomId = roomId;
      this.isHost = isInitiator;
      
      // Initialize peer with the appropriate role
      this.setupPeer(isInitiator);
    });

    this.socket.on('room-full', () => {
      console.log('Room is full');
      this.onConnectionStatus({
        connected: false,
        error: 'Room is full. Only two users are allowed.'
      });
    });

    this.socket.on('signal', (signal: any) => {
      console.log('Received signaling data');
      if (this.peer) {
        this.peer.signal(signal);
      }
    });

    this.socket.on('peer-joined', () => {
      console.log('Peer joined');
      this.onPeerJoined?.();
    });

    this.socket.on('peer-left', () => {
      console.log('Peer left');
      this.onPeerLeft?.();
      this.cleanupPeer();
    });
  }

  private setupPeer(initiator: boolean): void {
    console.log('Setting up peer as', initiator ? 'initiator' : 'receiver');
    
    // Clean up existing peer if it exists
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    // Create a new peer
    this.peer = new SimplePeer({
      initiator: initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    // Set up peer event handlers
    this.peer.on('signal', (data) => {
      console.log('Sending signal data');
      this.socket.emit('signal', {
        roomId: this.roomId,
        signal: data
      });
    });

    this.peer.on('connect', () => {
      console.log('Peer connection established');
      this.onConnectionStatus({ connected: true });
    });

    this.peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString()) as DataMessage;
        this.handleDataMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.onConnectionStatus({
        connected: false,
        error: `Peer connection error: ${err.message}`
      });
    });

    this.peer.on('close', () => {
      console.log('Peer connection closed');
      this.onConnectionStatus({
        connected: false,
        error: 'Connection closed'
      });
    });
  }

  private handleDataMessage(message: DataMessage): void {
    console.log('Received data message:', message.type);
    
    switch (message.type) {
      case 'videoState':
        this.onStateUpdate(message.payload);
        break;
      case 'chat':
        this.onMessage(message.payload);
        break;
      case 'ping':
        // Echo back for connection health checks
        this.sendData({
          type: 'ping',
          payload: message.payload
        });
        break;
    }
  }

  private sendData(data: DataMessage): void {
    if (this.peer && this.peer.connected) {
      try {
        this.peer.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending data:', error);
      }
    } else {
      console.warn('Cannot send data: peer not connected');
    }
  }

  private cleanupPeer(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  // Public API

  public initiatePeer(isInitiator: boolean, roomId: string): void {
    console.log('Initiating peer connection:', {isInitiator, roomId});
    this.roomId = roomId;
    this.isHost = isInitiator;
    
    if (isInitiator) {
      this.socket.emit('create-room');
    } else {
      this.socket.emit('join-room', roomId);
    }
  }

  public updateVideoState(state: VideoState): void {
    console.log('Updating video state:', state);
    this.sendData({
      type: 'videoState',
      payload: state
    });
  }

  public sendChatMessage(text: string): void {
    if (!text.trim()) return;
    
    const message: ChatMessage = {
      text: text.trim(),
      sender: this.username,
      timestamp: Date.now()
    };
    
    console.log('Sending chat message:', message);
    
    // Send to peer
    this.sendData({
      type: 'chat',
      payload: message
    });
    
    // Also emit locally to display in our own chat
    this.onMessage(message);
  }

  public cleanup(): void {
    console.log('Cleaning up WebRTC service');
    
    if (this.roomId) {
      this.socket.emit('leave-room', this.roomId);
    }
    
    this.cleanupPeer();
    this.socket.disconnect();
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public isRoomHost(): boolean {
    return this.isHost;
  }
} 