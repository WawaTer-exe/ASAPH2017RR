import { createServer } from "http";
import { handleAuthRoute } from "./routes/authRoutes";
import { photonManager } from "./managers/photonManager";
import { verifyToken } from "./utils/auth";

const PORT_HTTP = process.env.PORT_HTTP || 3000;
const PORT_PHOTON = process.env.PORT_PHOTON || 2059;
const MOTD = process.env.MOTD || "Welcome to Asaph Multiplayer Servers!";

export interface ConnectionContext {
  socket: any;
  playerId: number;
  username: string;
  currentRoom: string | null;
}

// 1. HTTP API Web Server (Port 3000)
const httpServer = createServer((req, res) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);

  if (url.pathname === "/api/config/v2") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      "MessageOfTheDay": MOTD,
      "IgnoreVersionCheck": process.env.IGNORE_VERSION_CHECK === "true"
    }));
  }

  if (url.pathname.startsWith("/api/player")) {
    return handleAuthRoute(req, res, url);
  }

  res.writeHead(404);
  res.end();
});

httpServer.listen(PORT_HTTP, () => console.log(`🚀 API Infrastructure listening on port ${PORT_HTTP}`));

// 2. Photon Multiplayer Socket Server (Port 2059)
const activePeers = new Map<any, ConnectionContext>();

Bun.listen({
  hostname: "0.0.0.0",
  port: Number(PORT_PHOTON),
  socket: {
    open(socket) {
      console.log("🎮 [Photon Socket] Client socket attached.");
    },
    data(socket, data) {
      try {
        const messageString = data.toString().trim();
        if (!messageString) return;

        const packet = JSON.parse(messageString);
        let context = activePeers.get(socket);

        if (packet.op === "AUTHENTICATE") {
          const payload = verifyToken(packet.token);
          if (!payload) {
            socket.write(Buffer.from(JSON.stringify({ error: "Session validation failed" }) + "\n"));
            return socket.end();
          }

          context = {
            socket,
            playerId: payload.playerId,
            username: payload.username,
            currentRoom: null
          };
          activePeers.set(socket, context);
          console.log(`⚡ [Photon] Peer linked securely to Account: ${payload.username}`);
          socket.write(Buffer.from(JSON.stringify({ status: "AUTHENTICATED" }) + "\n"));
          return;
        }

        if (!context) return;

        switch (packet.op) {
          case "JOIN_ROOM":
            photonManager.handleJoinOrCreateRoom(context, packet.roomName || "LockerRoom");
            break;

          case "TRANSIT_DATA":
            if (context.currentRoom) {
              photonManager.broadcastToRoom(context.currentRoom, {
                action: "NET_SYNC",
                senderId: context.playerId,
                data: packet.data
              }, context.playerId);
            }
            break;
        }
      } catch (err) {
        // Suppress buffer noise
      }
    },
    close(socket) {
      const context = activePeers.get(socket);
      if (context) {
        photonManager.handlePlayerLeave(context);
        activePeers.delete(socket);
      }
    }
  }
});

console.log(`🌐 Photon Multiplayer Server actively listening on port ${PORT_PHOTON}`);
