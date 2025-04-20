export interface RoomData {
  id: string;
  users: Set<string>;
  hostId?: string;
}

export interface SignalData {
  type: string;
  [key: string]: any;
}

export interface ServerToClientEvents {
  signal: (data: SignalData) => void;
  'room-full': () => void;
  'peer-joined': () => void;
  'peer-left': () => void;
  'host-left': () => void;
}

export interface ClientToServerEvents {
  signal: (data: SignalData) => void;
  'join-room': (roomId: string) => void;
  'leave-room': (roomId: string) => void;
  'create-room': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  roomId?: string;
} 