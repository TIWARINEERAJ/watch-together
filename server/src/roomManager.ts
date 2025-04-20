import { RoomData } from './types';

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map();

  createRoom(roomId: string): RoomData {
    const room: RoomData = {
      id: roomId,
      users: new Set()
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (room.users.size >= 2) {
      return false;
    }

    room.users.add(userId);
    if (!room.hostId) {
      room.hostId = userId;
    }

    return true;
  }

  leaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.delete(userId);
    
    if (room.hostId === userId) {
      const [newHost] = room.users;
      room.hostId = newHost;
    }

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  getRoom(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  isRoomHost(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.hostId === userId;
  }

  getRoomUsers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users) : [];
  }

  getRoomSize(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room?.users.size ?? 0;
  }

  cleanup(): void {
    this.rooms.clear();
  }
} 