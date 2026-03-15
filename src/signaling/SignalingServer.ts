import { WebSocket, WebSocketServer } from "ws";
import { RoomManager } from "./RoomManager.js";
import { v4 as uuid } from "uuid";

interface ExtendedWebSockets extends WebSocket {
  peerId: string;
  roomId: string;
  isRegistered: boolean;
}

//message types
const MSG = {
  REGISTER: "register", //register to the signaling
  PEERS: "peers", //send the list of peers in the room
  PEER_JOINED: "peer-joined", //broadcast the joining of a new peer to the room
  PEER_NAME_CHANGE: "name-change", //update a name of a peer
  UPDATE_PEER_NAME: "update-name-change",
};

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
    this.wss.on("connection", (ws: ExtendedWebSockets, req) => {
      ws.peerId = uuid();
      ws.isRegistered = false;

      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(ws, msg, req);
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

  handleMessage(ws: ExtendedWebSockets, msg: any, req: any) {
    console.log(msg);
    switch (msg.type) {
      case MSG.REGISTER: {
        const ip = this.getIP(req);
        const roomId = this.rooms.getRoomId(ip, msg.roomCode ?? null);

        ws.peerId = ws.peerId;
        ws.isRegistered = true;
        ws.roomId = roomId;

        const peerInfo = {
          ip: ip,
          displayName: msg.displayName ?? "Anonymous",
          deviceType: msg.deviceType ?? "desktop",
        };

        this.rooms.join(ws.peerId, ws.roomId, peerInfo);
        this.sockets.set(ws.peerId, ws);

        this.send(ws, {
          type: MSG.PEERS,
          selfId: ws.peerId,
          selfInfo: peerInfo,
          peers: this.rooms
            .getRoomPeers(roomId)
            .filter((p) => p.peerId !== ws.peerId),
        });

        this.broadcast(roomId, ws.peerId, {
          type: MSG.PEER_JOINED,
          peer: { ...peerInfo, peerId: ws.peerId },
        });
        break;
      }

      //might need to update this
      case MSG.PEER_NAME_CHANGE:
        {
          if (this.rooms.updatePeerName(msg.peerId, msg.displayName)) {
            this.send(ws, {
              type: MSG.UPDATE_PEER_NAME,
              peer: {
                peerId: ws.peerId,
                displayName: msg.displayName,
              },
            });
          }
        }
        break;
    }
  }

  send(ws: ExtendedWebSockets, data: any) {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      console.error("somthing went wrong");
    }
  }

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

  getIP(req: any): string {
    return req.socket.remoteAddress || "unknown";
  }
}
