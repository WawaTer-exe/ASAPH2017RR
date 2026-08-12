import { IncomingMessage, ServerResponse } from "http";
import { paintballManager } from "../managers/paintballManager";

export async function handleRoomRoutes(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.writeHead(200, { "Content-Type": "application/json" });

  if (url.pathname === "/api/rooms/broker" && req.method === "GET") {
    const publicGames = paintballManager.getPublicBrokerList();
    return res.end(JSON.stringify({
      success: true,
      rooms: publicGames
    }));
  }

  res.writeHead(404);
  res.end();
}
