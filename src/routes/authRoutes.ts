import { IncomingMessage, ServerResponse } from "http";
import { generateToken } from "../utils/auth";

const mockPlayerDb = new Map<string, { id: number; pass: string; name: string }>();
mockPlayerDb.set("coach", { id: 1, pass: "password123", name: "Coach" });

export async function handleAuthRoute(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.writeHead(200, { "Content-Type": "application/json" });

  if (url.pathname === "/api/player/login" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { username, password } = JSON.parse(body);
        const player = mockPlayerDb.get(username?.toLowerCase()?.trim());

        if (!player || player.pass !== password) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid credentials" }));
        }

        const token = generateToken({ playerId: player.id, username: player.name });
        console.log(`🔐 Issued security passport for player: ${player.name}`);

        return res.end(JSON.stringify({
          success: true,
          token: token,
          playerId: player.id,
          displayName: player.name,
          photonServerTarget: `localhost:${process.env.PORT_PHOTON || 8080}`,
          startingRoom: "LockerRoom"
        }));
      } catch (err) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Malformed payload" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
}
