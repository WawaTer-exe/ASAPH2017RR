import { ConnectionContext } from "../index";
import { photonManager } from "./photonManager";

export interface PaintballMatch {
  roomName: string;
  state: "LOBBY" | "PLAYING" | "OVER";
  redScore: number;
  blueScore: number;
  playerTeams: Map<number, "RED" | "BLUE">;
  roundTimer: number;
}

export class PaintballManager {
  private activeMatches = new Map<string, PaintballMatch>();

  getPublicBrokerList() {
    const list: any[] = [];
    for (const [roomName, match] of this.activeMatches.entries()) {
      const photonRoom = (photonManager as any).activeRooms?.get(roomName);
      const playerCount = photonRoom ? photonRoom.players.length : 0;

      list.push({
        roomName,
        state: match.state,
        playerCount,
        maxPlayers: 8,
        score: `R: ${match.redScore} - B: ${match.blueScore}`
      });
    }
    return list;
  }

  initializeMatch(roomName: string) {
    if (this.activeMatches.has(roomName)) return;

    this.activeMatches.set(roomName, {
      roomName,
      state: "LOBBY",
      redScore: 0,
      blueScore: 0,
      playerTeams: new Map(),
      roundTimer: 300
    });
    console.log(`🎨 [Paintball Engine] Tracked match room: ${roomName}`);
  }

  assignTeam(roomName: string, client: ConnectionContext) {
    const match = this.activeMatches.get(roomName);
    if (!match) return;

    let redCount = 0;
    let blueCount = 0;
    for (const team of match.playerTeams.values()) {
      if (team === "RED") redCount++;
      if (team === "BLUE") blueCount++;
    }

    const assignedTeam = redCount <= blueCount ? "RED" : "BLUE";
    match.playerTeams.set(client.playerId, assignedTeam);

    console.log(`🎯 [Paintball] Assigned ${client.username} to Team: ${assignedTeam}`);

    photonManager.broadcastToRoom(roomName, {
      action: "TEAM_ASSIGNMENT",
      playerId: client.playerId,
      team: assignedTeam
    });
  }

  registerHit(roomName: string, attackerId: number, victimId: number) {
    const match = this.activeMatches.get(roomName);
    if (!match || match.state !== "PLAYING") return;

    const attackerTeam = match.playerTeams.get(attackerId);
    const victimTeam = match.playerTeams.get(victimId);

    if (!attackerTeam || !victimTeam || attackerTeam === victimTeam) return;

    if (attackerTeam === "RED") match.redScore++;
    if (attackerTeam === "BLUE") match.blueScore++;

    console.log(`💥 [Hit Reg] ${attackerId} tagged ${victimId}. Score -> R: ${match.redScore} | B: ${match.blueScore}`);

    photonManager.broadcastToRoom(roomName, {
      action: "SCORE_UPDATE",
      redScore: match.redScore,
      blueScore: match.blueScore,
      taggedId: victimId,
      killerId: attackerId
    });

    if (match.redScore >= 50 || match.blueScore >= 50) {
      this.endRound(roomName);
    }
  }

  startRound(roomName: string) {
    const match = this.activeMatches.get(roomName);
    if (!match) return;
    match.state = "PLAYING";
    photonManager.broadcastToRoom(roomName, { action: "MATCH_START" });
  }

  endRound(roomName: string) {
    const match = this.activeMatches.get(roomName);
    if (!match) return;
    match.state = "OVER";
    const winner = match.redScore > match.blueScore ? "RED" : "BLUE";
    
    photonManager.broadcastToRoom(roomName, { action: "MATCH_END", winner });
    
    match.redScore = 0;
    match.blueScore = 0;
    match.state = "LOBBY";
  }

  removePlayer(roomName: string, playerId: number) {
    const match = this.activeMatches.get(roomName);
    if (match) {
      match.playerTeams.delete(playerId);
      const photonRoom = (photonManager as any).activeRooms?.get(roomName);
      if (!photonRoom || photonRoom.players.length === 0) {
        this.activeMatches.delete(roomName);
      }
    }
  }
}

export const paintballManager = new PaintballManager();
