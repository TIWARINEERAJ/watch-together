export interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  videoId: string;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

export interface ChatMessage {
  text: string;
  sender: string;
  timestamp: number;
}

export interface RoomInfo {
  id: string;
  isHost: boolean;
}

export type DataMessage = {
  type: 'videoState';
  payload: VideoState;
} | {
  type: 'chat';
  payload: ChatMessage;
} | {
  type: 'ping';
  payload: number;
}; 