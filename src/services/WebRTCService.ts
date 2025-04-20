import SimplePeer from 'simple-peer';
import { SignalingService } from './SignalingService';
import { VideoState, ConnectionStatus, ChatMessage, DataMessage } from './types';

export class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private signalingService: SignalingService;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;

  constructor(
    private onStateUpdate: (state: VideoState) => void,
    private onMessage: (message: ChatMessage) => void,
    private onConnectionStatus: (status: ConnectionStatus) => void,
    private onPeerJoined?: () => void,
    private onPeerLeft?: () => void
  ) {
    this.signalingService = new SignalingService();
    this.setupSignalingListeners();
  }

  private setupSignalingListeners(): void {
    this.signalingService.on('signal', (data) => {
      if (this.peer) {
        this.peer.signal(data);
      }
    });

    this.signalingService.on('connected', () => {
      this.onConnectionStatus({ connected: false });
    });

    this.signalingService.on('disconnected', (reason) => {
      this.onConnectionStatus({
        connected: false,
        error: `Disconnected: ${reason}`
      });
      this.cleanup();
    });

    this.signalingService.on('roomFull', () => {
      this.onConnectionStatus({
        connected: false,
        error: 'Room is full. Only two users are allowed.'
      });
    });

    this.signalingService.on('peerJoined', () => {
      this.onPeerJoined?.();
    });

    this.signalingService.on('peerLeft', () => {
      this.onPeerLeft?.();
      this.cleanup();
    });
  }

  private setupPeer(isInitiator: boolean): void {
    this.peer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on('signal', (data) => {
      this.signalingService.sendSignal(data);
    });

    this.peer.on('connect', () => {
      console.log('Peer connection established');
      this.onConnectionStatus({ connected: true });
      this.startPingInterval();
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
    });

    this.peer.on('data', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as DataMessage;
        this.handleDataMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      this.onConnectionStatus({
        connected: false,
        error: 'Peer connection error'
      });
    });

    this.peer.on('close', () => {
      this.onConnectionStatus({
        connected: false,
        error: 'Peer connection closed'
      });
      this.cleanup();
    });

    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (!this.peer?.connected) {
        this.onConnectionStatus({
          connected: false,
          error: 'Connection timeout'
        });
        this.cleanup();
      }
    }, 30000);
  }

  private handleDataMessage(message: DataMessage): void {
    switch (message.type) {
      case 'videoState':
        this.onStateUpdate(message.payload);
        break;
      case 'chat':
        this.onMessage(message.payload);
        break;
      case 'ping':
        this.sendData({
          type: 'ping',
          payload: message.payload
        });
        break;
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.peer?.connected) {
        this.lastPingTime = Date.now();
        this.sendData({
          type: 'ping',
          payload: this.lastPingTime
        });
      }
    }, 5000);
  }

  private sendData(data: DataMessage): void {
    if (this.peer?.connected) {
      this.peer.send(JSON.stringify(data));
    }
  }

  public initiatePeer(isInitiator: boolean, roomId: string): void {
    this.signalingService.joinRoom(roomId);
    this.setupPeer(isInitiator);
  }

  public updateVideoState(state: VideoState): void {
    this.sendData({
      type: 'videoState',
      payload: state
    });
  }

  public sendChatMessage(message: ChatMessage): void {
    this.sendData({
      type: 'chat',
      payload: message
    });
  }

  public cleanup(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.signalingService.leaveRoom();
  }

  public destroy(): void {
    this.cleanup();
    this.signalingService.disconnect();
  }

  public isConnected(): boolean {
    return this.peer?.connected ?? false;
  }
} 