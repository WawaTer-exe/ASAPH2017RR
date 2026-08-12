// Look for the joinRoom function inside your src/managers/lobbyManager.ts file and verify it matches this structure:
joinRoom(ws: WebSocket, roomCode: string) {
  const player = this.players.get(ws);
  if (!player) return;

  // Leave previous room if applicable
  if (player.roomCode) {
    this.broadcastToRoom(player.roomCode, {
      type: "PLAYER_LEFT",
      playerId: player.playerId
    }, ws);
  }

  player.roomCode = roomCode || "LockerRoom"; // Default fallback to Locker Room instance
  console.log(`🚪 [Room Engine] ${player.username} transitioned to instance: ${player.roomCode}`);

  // Broadcast to all other connections inside that room
  this.broadcastToRoom(player.roomCode, {
    type: "PLAYER_JOINED",
    playerId: player.playerId,
    username: player.username,
    position: { x: 0, y: 0, z: 0 } // Base spawning node coordinates
  }, ws);
}
