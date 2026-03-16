interface PeerInfo {
  ip: string;
  [key: string]: any;
}

export interface Peer extends PeerInfo {
  peerId: string;
  roomId: string;
}

export class RoomManager {
  private rooms: Map<string, Map<string, Peer>>;
  private peerRoom: Map<string, string>;

  constructor() {
    this.rooms = new Map();
    this.peerRoom = new Map();
  }

  getRoomId(ip: string, customCode: string | null = null): string {
    return customCode ?? ip;
  }

  join(peerId: string, roomId: string, peerInfo: PeerInfo) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    this.rooms.get(roomId)?.set(peerId, { ...peerInfo, peerId, roomId });

    this.peerRoom.set(peerId, roomId);
    console.log("rooms:", this.rooms);
    console.log("peers:", this.peerRoom);
  }

  leave(peerId: string): null | string {
    const roomId = this.peerRoom.get(peerId);
    if (!roomId) return null;

    this.rooms.get(roomId)?.delete(peerId);
    this.peerRoom.delete(peerId);
    if (this.rooms.get(roomId)?.size === 0) {
      this.rooms.delete(roomId);
    }
    return roomId;
  }

  getRoomPeers(roomId: string): Peer[] {
    return [...(this.rooms.get(roomId)?.values() ?? [])];
  }

  getPeerRoom(peerid: string): string | undefined {
    return this.peerRoom.get(peerid);
  }

  setNewDisplayName(peerId: string, roomId: string, updatedName: string) {
    const peer = this.rooms.get(roomId)?.get(peerId);
    if (!peer) return false;

    peer.displayName = updatedName;
    return true;
  }
}
