import { IncomingMessage, ServerResponse } from "http";
import { generateToken } from "../utils/auth";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { players } from "../db/schema";
import { eq } from "drizzle-orm";

// Connect directly to your persistent SQLite file
const sqlite = new Database("local.db");
const db = drizzle(sqlite);

export async function handleAuthRoute(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.writeHead(200, { "Content-Type": "application/json" });

  // Handle Player Login and Account Registration
  if (url.pathname === "/api/player/login" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Missing username or password" }));
        }

        const normalizedUser = username.toLowerCase().trim();

        // Check if the user already exists in local.db
        const existingUsers = await db.select().from(players).where(eq(players.username, normalizedUser)).execute();
        let activePlayer = existingUsers[0];

        if (!activePlayer) {
          // AUTO-REGISTRATION: If account is new, create it instantly
          console.log(`🆕 Creating new account for: ${username}`);
          const newPlayer = await db.insert(players).values({
            username: normalizedUser,
            displayName: username.trim(),
            passwordHash: Bun.password.hashSync(password), // Safely hash the password
            xp: 0,
            tokens: 500 // Starter currency balance
          }).returning();
          
          activePlayer = newPlayer[0];
        } else {
          // If user exists, check their password hash
          const passwordMatches = Bun.password.verifySync(password, activePlayer.passwordHash);
          if (!passwordMatches) {
            res.writeHead(401);
            return res.end(JSON.stringify({ error: "Invalid password for this account" }));
          }
        }

        // Generate the secure token passport
        const token = generateToken({ playerId: activePlayer.id, username: activePlayer.displayName });
        
        console.log(`🔐 Player logged in successfully: ${activePlayer.displayName} (ID: ${activePlayer.id})`);
        return res.end(JSON.stringify({
          success: true,
          token: token,
          playerId: activePlayer.id,
          displayName: activePlayer.displayName,
          tokens: activePlayer.tokens
        }));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: "Authentication system error" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Auth endpoint missing" }));
}
