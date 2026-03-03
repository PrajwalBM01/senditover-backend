import { WebSocket, WebSocketServer } from "ws";
import { RoomManager } from "./RoomManager.js";
import { v4 as uuid } from "uuid";

interface ExtendedWebSockets extends WebSocket {
  peerId: string;
  roomId: string;
  isRegistered: boolean;
}

export class SignalingServer {
  private wss: WebSocketServer;
  private rooms: RoomManager;
  private sockets: Map<string, ExtendedWebSockets>;
  constructor(server: any) {
    this.wss = new WebSocketServer({ server: server });
    this.rooms = new RoomManager();
    this.sockets = new Map<string, ExtendedWebSockets>();
  }

  attach() {
    this.wss.on("connection", (ws: ExtendedWebSockets) => {
      ws.peerId = uuid();
      ws.isRegistered = false;

      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(ws, msg);
      });

      ws.on("close", () => {
        if (!ws.isRegistered) return;

        const roomId = this.rooms.leave(ws.peerId);
        this.sockets.delete(ws.peerId);

        if (roomId) {
          this.broadcast(roomId, ws.peerId, {
            type: "peer-left",
            peerId: ws.peerId,
          });
        }
      });
    });
  }

  handleMessage(ws: ExtendedWebSockets, msg: any) {}

  broadcast(roomId: string, excludePeerId: string, data: any) {
    const peers = this.rooms.getRoomPeers(roomId);
    const json = JSON.stringify(data);
    for (const peer of peers) {
      if (peer.peerId === excludePeerId) continue;

      const ws = this.sockets.get(peer.peerId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }
}
