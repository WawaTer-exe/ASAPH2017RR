import { ConnectionContext } from "../index";

export interface PhotonRoom {
  roomName: string;
  players: ConnectionContext[];
  masterClientId: number;
}

export class PhotonManager {
  private activeRooms = new Map<string, PhotonRoom>();

  handleJoinOrCreateRoom(client: ConnectionContext, roomName: string) {
    let room = this.activeRooms.get(roomName);

    if (!room) {
      room = {
        roomName,
        players: [client],
        masterClientId: client.playerId
      };
      this.activeRooms.set(roomName, room);
      console.log(`🏰 [Photon] Created room: ${roomName}. Host ID: Player ${client.playerId}`);
    } else {
      room.players.push(client);
      console.log(`🚪 [Photon] Player ${client.playerId} joined room: ${roomName} (${room.players.length} online)`);
    }

    client.currentRoom = roomName;

    this.broadcastToRoom(roomName, {
      action: "PLAYER_ENTERED_ROOM",
      actorId: client.playerId,
      username: client.username,
      isMasterClient: room.masterClientId === client.playerId
    });
  }

  handlePlayerLeave(client: ConnectionContext) {
    if (!client.currentRoom) return;

    const room = this.activeRooms.get(client.currentRoom);
    if (!room) return;

    room.players = room.players.filter(p => p.playerId !== client.playerId);
    console.log(`🔌 [Photon] Player ${client.playerId} left room: ${client.currentRoom}`);

    if (room.players.length === 0) {
      this.activeRooms.delete(client.currentRoom);
    } else {
      if (room.masterClientId === client.playerId) {
        room.masterClientId = room.players[0].playerId;
        console.log(`👑 [Photon] Host left. Migrating Master Client to Player ID: ${room.masterClientId}`);
      }

      this.broadcastToRoom(client.currentRoom, {
        action: "PLAYER_LEFT_ROOM",
        actorId: client.playerId
      });
    }

    client.currentRoom = null;
  }

  broadcastToRoom(roomName: string, payload: object, excludePlayerId?: number) {
    const room = this.activeRooms.get(roomName);
    if (!room) return;

    const binaryPacket = Buffer.from(JSON.stringify(payload) + "\n");

    for (const client of room.players) {
      if (client.playerId !== excludePlayerId) {
        try {
          client.socket.write(binaryPacket);
        } catch (err) {
          console.error(`❌ Failed routing network frame to Player ${client.playerId}`);
        }
      }
    }
  }
}

export const photonManager = new PhotonManager();
